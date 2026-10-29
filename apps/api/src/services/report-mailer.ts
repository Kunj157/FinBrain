import { Prisma } from '@prisma/client';
import nodemailer from 'nodemailer';
import type { prisma as PrismaClientInstance } from '../prisma';
import { log, reportError } from '../middleware/observability';
import { buildReport, type ReportSummary, type ReportType } from './report-builder';

/**
 * Emails scheduled reports.
 *
 * Schedules are stored as AuditLog rows (entity "scheduled_report") by
 * routes/scheduled-reports.ts. This module sends the ones that have come due.
 * It does nothing at all unless SMTP_URL and REPORTS_FROM are configured.
 */

type Db = Pick<typeof PrismaClientInstance, 'auditLog' | 'transaction'>;

export interface MailTransport {
  sendMail(message: { from: string; to: string; subject: string; text: string; html: string }): Promise<unknown>;
}

export interface MailConfig {
  smtpUrl: string;
  from: string;
}

export interface ScheduleDetails {
  reportType: ReportType;
  email: string;
  dayOfMonth: number;
  enabled: boolean;
  lastSent: string | null;
}

/**
 * Reads SMTP_URL and REPORTS_FROM. Returns null when neither is set (the
 * feature is off). Setting only one is a deploy mistake and throws, so it
 * surfaces at boot rather than as reports that silently never arrive.
 */
export function readMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig | null {
  const smtpUrl = env.SMTP_URL?.trim();
  const from = env.REPORTS_FROM?.trim();
  if (!smtpUrl && !from) return null;
  if (!smtpUrl || !from) {
    throw new Error(
      'SMTP_URL and REPORTS_FROM must be set together to send scheduled reports. ' +
        `Missing: ${!smtpUrl ? 'SMTP_URL' : 'REPORTS_FROM'}.`,
    );
  }
  return { smtpUrl, from };
}

/** The most recent moment this schedule was supposed to fire, at or before `now` (UTC). */
export function lastOccurrence(
  schedule: Pick<ScheduleDetails, 'reportType' | 'dayOfMonth'>,
  now: Date,
): Date {
  for (let back = 0; back < 24; back++) {
    const month = now.getUTCMonth() - back;
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), month, schedule.dayOfMonth));
    const m = candidate.getUTCMonth();
    const inCycle =
      schedule.reportType === 'monthly' ||
      (schedule.reportType === 'quarterly' && m % 3 === 0) ||
      (schedule.reportType === 'annual' && m === 0);
    if (inCycle && candidate.getTime() <= now.getTime()) return candidate;
  }
  throw new Error('unreachable: no occurrence within 24 months');
}

/**
 * A schedule is due when its latest occurrence is newer than both the last
 * send and the moment it was created, so creating one on the 20th with
 * dayOfMonth 1 waits for the next 1st instead of firing immediately.
 */
export function isDue(
  schedule: ScheduleDetails & { createdAt: Date },
  now: Date,
): boolean {
  if (!schedule.enabled) return false;
  const occurrence = lastOccurrence(schedule, now).getTime();
  const since = Math.max(
    schedule.createdAt.getTime(),
    schedule.lastSent ? new Date(schedule.lastSent).getTime() : 0,
  );
  return occurrence > since;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (n: number) => n.toFixed(2);

export function renderReportEmail(type: ReportType, report: ReportSummary) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const subject = `FinBrain ${type} report: ${report.period.start} to ${report.period.end}`;

  const text = [
    `${label} report, ${report.period.start} to ${report.period.end}`,
    '',
    `Income:        ${money(report.totalIncome)}`,
    `Expenses:      ${money(report.totalExpenses)}`,
    `Net cash flow: ${money(report.netCashFlow)}`,
    `Transactions:  ${report.transactionCount}`,
    '',
    report.topCategories.length ? 'Top spending categories' : 'No spending in this period.',
    ...report.topCategories.map((c) => `  ${c.name}: ${money(c.amount)}`),
  ].join('\n');

  const rows = report.topCategories
    .map((c) => `<tr><td>${escapeHtml(c.name)}</td><td align="right">${money(c.amount)}</td></tr>`)
    .join('');
  const html =
    `<h2>${escapeHtml(label)} report</h2>` +
    `<p>${escapeHtml(report.period.start)} to ${escapeHtml(report.period.end)}</p>` +
    `<ul><li>Income: ${money(report.totalIncome)}</li><li>Expenses: ${money(report.totalExpenses)}</li>` +
    `<li>Net cash flow: ${money(report.netCashFlow)}</li><li>Transactions: ${report.transactionCount}</li></ul>` +
    (rows ? `<h3>Top spending categories</h3><table>${rows}</table>` : '<p>No spending in this period.</p>');

  return { subject, text, html };
}

export function createTransport(config: MailConfig): MailTransport {
  return nodemailer.createTransport(config.smtpUrl);
}

/** Sends every report that is due. Returns counts so callers and tests can see what happened. */
export async function sendDueReports(
  db: Db,
  transport: MailTransport,
  from: string,
  now: Date = new Date(),
): Promise<{ sent: number; failed: number }> {
  const rows = await db.auditLog.findMany({ where: { entity: 'scheduled_report' } });
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const details = row.details as unknown as ScheduleDetails | null;
    if (!details || !isDue({ ...details, lastSent: details.lastSent ?? null, createdAt: row.createdAt }, now)) {
      continue;
    }

    // Claim the row before sending: the update only matches while lastSent is
    // still what we read, so two instances ticking together send one email.
    const previous = details.lastSent ?? null;
    const stamp = now.toISOString();
    const claimed = await db.auditLog.updateMany({
      where: {
        id: row.id,
        details: { path: ['lastSent'], equals: previous ?? Prisma.JsonNull },
      },
      data: { details: { ...details, lastSent: stamp } as never },
    });
    if (claimed.count !== 1) continue;

    try {
      const report = await buildReport(db, row.userId, details.reportType, now);
      await transport.sendMail({ from, to: details.email, ...renderReportEmail(details.reportType, report) });
      sent++;
      log('info', 'scheduled report sent', { scheduleId: row.id, reportType: details.reportType });
    } catch (error) {
      failed++;
      reportError(error instanceof Error ? error : new Error(String(error)), {
        phase: 'scheduled-report',
        scheduleId: row.id,
      });
      // Hand the claim back so the next tick retries.
      await db.auditLog
        .updateMany({
          where: { id: row.id, details: { path: ['lastSent'], equals: stamp } },
          data: { details: { ...details, lastSent: previous } as never },
        })
        .catch(() => undefined);
    }
  }

  return { sent, failed };
}

/** Starts the periodic check. The timer is unref'd so it never keeps the process alive. */
export function startReportWorker(
  db: Db,
  config: MailConfig,
  options: { intervalMs?: number; transport?: MailTransport } = {},
): NodeJS.Timeout {
  const transport = options.transport ?? createTransport(config);
  const intervalMs = options.intervalMs ?? 60 * 60 * 1000;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await sendDueReports(db, transport, config.from);
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), { phase: 'scheduled-report-tick' });
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  void tick();
  log('info', 'scheduled report email enabled', { intervalMs });
  return timer;
}
