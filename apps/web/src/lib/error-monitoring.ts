/**
 * Browser error reporting through Sentry, only when VITE_SENTRY_DSN is set.
 *
 * The SDK is loaded with a dynamic import so it never enters the entry bundle
 * and, with no DSN, is never downloaded. Personal data collection (user info, cookies, headers, bodies, query strings) is off and no tracing or
 * session replay is enabled: this app shows people their own finances.
 */

let capture: ((error: unknown) => void) | null = null;

export async function initErrorMonitoring(
  dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN,
): Promise<boolean> {
  if (!dsn?.trim()) return false;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn: dsn.trim(),
      environment: import.meta.env.MODE,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      tracesSampleRate: 0,
    });
    capture = (error) => {
      Sentry.captureException(error);
    };
    return true;
  } catch (error) {
    console.warn('Error monitoring failed to load:', error);
    return false;
  }
}

/** Report an error React caught or let escape. A no-op until monitoring is initialised. */
export function reportRenderError(error: unknown): void {
  try {
    capture?.(error);
  } catch {
    // Reporting must not become a second failure.
  }
}

/** Test seam. */
export function resetErrorMonitoring(): void {
  capture = null;
}
