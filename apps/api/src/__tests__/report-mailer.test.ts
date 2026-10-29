import { describe, it, expect, vi } from 'vitest';
import {
  isDue,
  lastOccurrence,
  readMailConfig,
  renderReportEmail,
  sendDueReports,
  type MailTransport,
  type ScheduleDetails,
} from '../services/report-mailer';
import { summarizeTransactions } from '../services/report-builder';

const d = (iso: string) => new Date(iso);

const schedule = (over: Partial<ScheduleDetails & { createdAt: Date }> = {}) => ({
  reportType: 'monthly' as const,
  email: 'person@example.test',
  dayOfMonth: 1,
  enabled: true,
  lastSent: null,
  createdAt: d('2026-01-10T00:00:00Z'),
  ...over,
});

describe('readMailConfig', () => {
  it('is off when nothing is set', () => {
    expect(readMailConfig({})).toBeNull();
    expect(readMailConfig({ SMTP_URL: '  ', REPORTS_FROM: '' })).toBeNull();
  });

  it('returns both values when both are set', () => {
    expect(readMailConfig({ SMTP_URL: 'smtp://localhost:1025', REPORTS_FROM: 'FinBrain <r@example.test>' })).toEqual({
      smtpUrl: 'smtp://localhost:1025',
      from: 'FinBrain <r@example.test>',
    });
  });

  it('rejects a half-configured pair', () => {
    expect(() => readMailConfig({ SMTP_URL: 'smtp://localhost:1025' })).toThrow(/REPORTS_FROM/);
    expect(() => readMailConfig({ REPORTS_FROM: 'r@example.test' })).toThrow(/SMTP_URL/);
  });
});

describe('lastOccurrence / isDue', () => {
  it('monthly fires on its day each month', () => {
    expect(lastOccurrence({ reportType: 'monthly', dayOfMonth: 5 }, d('2026-03-10T12:00:00Z'))).toEqual(
      d('2026-03-05T00:00:00Z'),
    );
    expect(lastOccurrence({ reportType: 'monthly', dayOfMonth: 15 }, d('2026-03-10T12:00:00Z'))).toEqual(
      d('2026-02-15T00:00:00Z'),
    );
  });

  it('quarterly only fires in Jan, Apr, Jul and Oct', () => {
    expect(lastOccurrence({ reportType: 'quarterly', dayOfMonth: 1 }, d('2026-05-20T00:00:00Z'))).toEqual(
      d('2026-04-01T00:00:00Z'),
    );
  });

  it('annual only fires in January and crosses the year boundary', () => {
    expect(lastOccurrence({ reportType: 'annual', dayOfMonth: 2 }, d('2026-08-01T00:00:00Z'))).toEqual(
      d('2026-01-02T00:00:00Z'),
    );
    expect(lastOccurrence({ reportType: 'annual', dayOfMonth: 20 }, d('2026-01-05T00:00:00Z'))).toEqual(
      d('2025-01-20T00:00:00Z'),
    );
  });

  it('is due once its day has passed and not before', () => {
    const s = schedule({ dayOfMonth: 15, createdAt: d('2026-01-01T00:00:00Z'), lastSent: '2026-02-15T00:05:00Z' });
    expect(isDue(s, d('2026-03-14T23:59:00Z'))).toBe(false);
    expect(isDue(s, d('2026-03-15T00:00:00Z'))).toBe(true);
  });

  it('is not due again after it has been sent for this occurrence', () => {
    const s = schedule({ lastSent: '2026-03-01T00:30:00Z' });
    expect(isDue(s, d('2026-03-20T00:00:00Z'))).toBe(false);
    expect(isDue(s, d('2026-04-01T00:00:00Z'))).toBe(true);
  });

  it('does not fire immediately for a schedule created after this month\'s day', () => {
    const s = schedule({ createdAt: d('2026-03-20T00:00:00Z') });
    expect(isDue(s, d('2026-03-21T00:00:00Z'))).toBe(false);
    expect(isDue(s, d('2026-04-01T00:00:00Z'))).toBe(true);
  });

  it('is never due when disabled', () => {
    expect(isDue(schedule({ enabled: false }), d('2026-06-01T00:00:00Z'))).toBe(false);
  });
});

describe('renderReportEmail', () => {
  const report = summarizeTransactions(
    [
      { type: 'income', amount: 2000 },
      { type: 'expense', amount: -30.5, category: { name: '<script>alert(1)</script>' } },
      { type: 'expense', amount: -10, category: { name: 'Food & Drink' } },
    ],
    d('2026-02-01T00:00:00Z'),
    d('2026-03-01T00:00:00Z'),
  );

  it('summarises totals and escapes category names in the HTML body', () => {
    expect(report.netCashFlow).toBe(1959.5);
    const mail = renderReportEmail('monthly', report);
    expect(mail.subject).toBe('FinBrain monthly report: 2026-02-01 to 2026-03-01');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('Food &amp; Drink');
    expect(mail.text).toContain('Net cash flow: 1959.50');
  });
});

describe('sendDueReports', () => {
  function fakeDb(rows: { id: string; userId: string; createdAt: Date; details: Record<string, unknown> }[]) {
    return {
      auditLog: {
        findMany: vi.fn().mockResolvedValue(rows),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      transaction: {
        findMany: vi.fn().mockResolvedValue([{ type: 'expense', amount: -12, category: { name: 'Food' } }]),
      },
    } as never;
  }
  const row = (over: Record<string, unknown> = {}, createdAt = d('2026-01-01T00:00:00Z')) => ({
    id: 'sched-1',
    userId: 'user-1',
    createdAt,
    details: { reportType: 'monthly', email: 'person@example.test', dayOfMonth: 1, enabled: true, lastSent: null, ...over },
  });

  it('sends a due report through the transport and records the send', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const db = fakeDb([row()]);
    const result = await sendDueReports(db, { sendMail } as MailTransport, 'FinBrain <r@example.test>', d('2026-03-02T00:00:00Z'));

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0][0]).toMatchObject({ from: 'FinBrain <r@example.test>', to: 'person@example.test' });
    const claim = (db as never as { auditLog: { updateMany: ReturnType<typeof vi.fn> } }).auditLog.updateMany.mock.calls[0][0];
    expect(claim.data.details.lastSent).toBe('2026-03-02T00:00:00.000Z');
  });

  it('skips reports that are not due or are disabled', async () => {
    const sendMail = vi.fn();
    const db = fakeDb([row({ lastSent: '2026-03-01T00:10:00Z' }), row({ enabled: false })]);
    const result = await sendDueReports(db, { sendMail }, 'r@example.test', d('2026-03-02T00:00:00Z'));
    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('does not send when another instance already claimed the row', async () => {
    const sendMail = vi.fn();
    const db = fakeDb([row()]);
    (db as never as { auditLog: { updateMany: ReturnType<typeof vi.fn> } }).auditLog.updateMany.mockResolvedValue({ count: 0 });
    const result = await sendDueReports(db, { sendMail }, 'r@example.test', d('2026-03-02T00:00:00Z'));
    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('releases the claim when delivery fails so the next tick retries', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('smtp down'));
    const db = fakeDb([row()]);
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await sendDueReports(db, { sendMail }, 'r@example.test', d('2026-03-02T00:00:00Z'));
    quiet.mockRestore();

    expect(result).toEqual({ sent: 0, failed: 1 });
    const calls = (db as never as { auditLog: { updateMany: ReturnType<typeof vi.fn> } }).auditLog.updateMany.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][0].data.details.lastSent).toBeNull();
  });
});
