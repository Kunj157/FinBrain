/**
 * One-click access to the public demo account.
 *
 * Production auth is fail-closed, so a visitor following the demo link would
 * otherwise have to sign up before seeing anything. Instead the API mints a
 * Clerk sign-in ticket for one named account (DEMO_USER_EMAIL), which the web
 * app redeems with the `ticket` strategy. No password ships in the bundle, and
 * a ticket is single-use and expires in minutes.
 *
 * Only the configured demo user can ever be issued a ticket. With
 * DEMO_USER_EMAIL unset the feature does not exist.
 */

export const DEMO_TICKET_TTL_SECONDS = 120;

export class DemoUnavailableError extends Error {
  constructor(reason: string) {
    super(`Demo is unavailable: ${reason}`);
    this.name = 'DemoUnavailableError';
  }
}

/** Whether `email` is the shared demo account, which visitors must not delete. */
export function isDemoUser(email: string, demoEmail: string | undefined): boolean {
  const demo = demoEmail?.trim().toLowerCase();
  return !!demo && email.trim().toLowerCase() === demo;
}

/** The slice of the Clerk backend client this needs, so tests can fake it. */
export interface DemoClerk {
  users: { getUserList(params: { emailAddress: string[] }): Promise<{ data: Array<{ id: string }> }> };
  signInTokens: { createSignInToken(params: { userId: string; expiresInSeconds: number }): Promise<{ token: string }> };
}

export async function createDemoTicket({
  demoEmail,
  clerk,
}: {
  demoEmail: string | undefined;
  clerk: DemoClerk | null;
}): Promise<string> {
  const email = demoEmail?.trim();
  if (!email) throw new DemoUnavailableError('DEMO_USER_EMAIL is not set');
  if (!clerk) throw new DemoUnavailableError('Clerk is not configured');

  const { data: users } = await clerk.users.getUserList({ emailAddress: [email] });
  if (users.length !== 1) {
    throw new DemoUnavailableError(`expected exactly one Clerk user for the demo email, found ${users.length}`);
  }

  const { token } = await clerk.signInTokens.createSignInToken({
    userId: users[0].id,
    expiresInSeconds: DEMO_TICKET_TTL_SECONDS,
  });
  return token;
}
