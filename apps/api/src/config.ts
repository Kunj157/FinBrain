/**
 * Configuration, validated once at startup.
 *
 * Nothing here is read lazily: a deploy that is missing a secret should fail
 * immediately and loudly, not hours later when the first user hits the path
 * that needed it.
 */

export type AppEnvironment = 'production' | 'development' | 'test';

function readEnvironment(): AppEnvironment {
  const value = (process.env.NODE_ENV || 'development').toLowerCase();
  if (value === 'production') return 'production';
  if (value === 'test') return 'test';
  return 'development';
}

export const environment = readEnvironment();
export const isProduction = environment === 'production';

/**
 * Whether unauthenticated requests are answered as the seeded dev user.
 *
 * This is deliberately impossible to enable in production. It used to switch
 * itself on whenever CLERK_SECRET_KEY happened to be absent, so a deploy that
 * simply forgot the variable served one account's financial data to anyone who
 * found the URL — silently, with no error and no log line.
 */
export const devAuthBypassEnabled =
  !isProduction && (process.env.DEV_MODE === 'true' || !process.env.CLERK_SECRET_KEY);

/** Secrets without which production cannot run safely. */
const REQUIRED_IN_PRODUCTION = ['DATABASE_URL', 'CLERK_SECRET_KEY'] as const;

export function assertProductionConfig(): void {
  if (!isProduction) return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());

  if (process.env.DEV_MODE === 'true') {
    throw new Error(
      'DEV_MODE=true is set with NODE_ENV=production. That combination would disable ' +
        'authentication for every request. Refusing to start.',
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''} in production: ` +
        `${missing.join(', ')}. Refusing to start — without these the API cannot ` +
        'authenticate requests.',
    );
  }
}
