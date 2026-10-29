import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const init = vi.fn();
const captureException = vi.fn();
const flush = vi.fn().mockResolvedValue(true);
vi.mock('@sentry/node', () => ({ init, captureException, flush }));

import {
  flushErrorMonitoring,
  initErrorMonitoring,
  reportError,
  resetErrorMonitoring,
} from '../middleware/observability';

describe('error monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flush.mockResolvedValue(true);
    resetErrorMonitoring();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('does nothing without a DSN', async () => {
    expect(await initErrorMonitoring(undefined)).toBe(false);
    expect(await initErrorMonitoring('   ')).toBe(false);
    reportError(new Error('boom'));
    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('initialises Sentry with personal data collection off or integrations when a DSN is set', async () => {
    expect(await initErrorMonitoring('https://key@sentry.example.test/1')).toBe(true);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.example.test/1',
        dataCollection: expect.objectContaining({ userInfo: false, cookies: false, httpHeaders: false }),
        defaultIntegrations: false,
      }),
    );
  });

  it('forwards reported errors with their context, and still logs them', async () => {
    await initErrorMonitoring('https://key@sentry.example.test/1');
    const error = new Error('boom');
    reportError(error, { requestId: 'req-1' });
    expect(captureException).toHaveBeenCalledWith(error, { extra: { requestId: 'req-1' } });
    expect(console.error).toHaveBeenCalled();
  });

  it('never throws when the vendor does', async () => {
    await initErrorMonitoring('https://key@sentry.example.test/1');
    captureException.mockImplementationOnce(() => {
      throw new Error('sentry down');
    });
    expect(() => reportError(new Error('boom'))).not.toThrow();
  });

  it('flushes only when enabled', async () => {
    await flushErrorMonitoring();
    expect(flush).not.toHaveBeenCalled();
    await initErrorMonitoring('https://key@sentry.example.test/1');
    await flushErrorMonitoring();
    expect(flush).toHaveBeenCalledWith(2000);
  });
});
