import { describe, it, expect, vi, beforeEach } from 'vitest';

const init = vi.fn();
const captureException = vi.fn();
vi.mock('@sentry/react', () => ({ init, captureException }));

import { initErrorMonitoring, reportRenderError, resetErrorMonitoring } from './error-monitoring';

describe('web error monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetErrorMonitoring();
  });

  it('does nothing without a DSN', async () => {
    expect(await initErrorMonitoring('')).toBe(false);
    reportRenderError(new Error('boom'));
    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('initialises Sentry with personal data collection off and forwards errors when a DSN is set', async () => {
    expect(await initErrorMonitoring('https://key@sentry.example.test/1')).toBe(true);
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ dataCollection: expect.objectContaining({ userInfo: false, cookies: false, httpHeaders: false }), tracesSampleRate: 0 }));
    const error = new Error('boom');
    reportRenderError(error);
    expect(captureException).toHaveBeenCalledWith(error);
  });
});
