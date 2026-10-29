import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { isProduction } from '../config';

/**
 * Request correlation and structured logging.
 *
 * Production previously logged through `morgan('dev')` — human-readable lines
 * that no log aggregator can parse — and recorded failures with a bare
 * console.error carrying no request context. A failure was invisible until a
 * user reported it, and there was no way to tell one occurrence from ten
 * thousand.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

type Level = 'info' | 'warn' | 'error';

/** One JSON object per line in production; readable text locally. */
export function log(level: Level, message: string, fields: Record<string, unknown> = {}): void {
  if (!isProduction) {
    const extra = Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : '';
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[${level}] ${message}${extra}`,
    );
    return;
  }

  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'finbrain-api',
    ...fields,
  });

  if (level === 'error') console.error(line);
  else console.log(line);
}

/**
 * Tag every request so each log line can be traced back to it, and hand the
 * id to the client so a user can quote it when something goes wrong.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get('x-request-id');
  req.requestId = incoming || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);

  const startedAt = process.hrtime.bigint();

  // Captured now, not in the finish handler: Express rewrites req.url/req.path
  // to be relative to the matched router, so by the time the response finishes
  // every line would read path "/". The query string is dropped because it
  // carries user-supplied values that do not belong in logs.
  const path = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    // Health probes fire constantly and would drown everything else.
    if (path === '/api/v1/health' || path === '/api/v1/ready') return;

    log(res.statusCode >= 500 ? 'error' : 'info', 'request', {
      requestId: req.requestId,
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      // Identifies the account without putting an email or name in the logs.
      userId: req.userId,
    });
  });

  next();
}

/** Vendor sink, set by initErrorMonitoring. Null means errors are only logged. */
type ErrorSink = {
  capture(error: Error, context: Record<string, unknown>): void;
  flush(timeoutMs: number): Promise<unknown>;
};
let sink: ErrorSink | null = null;

/**
 * Forward errors to Sentry when SENTRY_DSN is set. With no DSN this does
 * nothing and @sentry/node is never loaded.
 *
 * Auto-instrumentation and default integrations are off: this sends only
 * errors that reportError is handed, with the context passed there. Personal
 * data (cookies, IPs, request bodies) is not attached, because this is
 * financial data.
 */
export async function initErrorMonitoring(dsn: string | undefined = process.env.SENTRY_DSN): Promise<boolean> {
  if (!dsn?.trim()) return false;
  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn: dsn.trim(),
    environment: process.env.NODE_ENV || 'development',
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    defaultIntegrations: false,
    tracesSampleRate: 0,
  });
  sink = {
    capture: (error, context) => {
      Sentry.captureException(error, { extra: context });
    },
    flush: (timeoutMs) => Sentry.flush(timeoutMs),
  };
  log('info', 'error monitoring enabled');
  return true;
}

/** Waits for queued events to leave the process; call before exiting on a fatal error. */
export async function flushErrorMonitoring(timeoutMs = 2000): Promise<void> {
  await sink?.flush(timeoutMs).catch(() => undefined);
}

/** Test seam: drop the vendor sink. */
export function resetErrorMonitoring(): void {
  sink = null;
}

/**
 * Report an unhandled error.
 *
 * Always writes a structured, searchable log record. When SENTRY_DSN is set
 * (see initErrorMonitoring) it is also sent to Sentry.
 */
export function reportError(error: Error, context: Record<string, unknown> = {}): void {
  log('error', error.message, {
    ...context,
    errorName: error.name,
    stack: error.stack,
  });
  try {
    sink?.capture(error, context);
  } catch {
    // Monitoring must never turn one failure into two.
  }
}
