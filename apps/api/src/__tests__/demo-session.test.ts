import { describe, it, expect, vi } from 'vitest';
import { createDemoTicket, DemoUnavailableError, isDemoUser } from '../services/demo-session';

function fakeClerk(users: Array<{ id: string }>) {
  return {
    users: { getUserList: vi.fn().mockResolvedValue({ data: users }) },
    signInTokens: { createSignInToken: vi.fn().mockResolvedValue({ token: 'ticket-123' }) },
  };
}

describe('demo session tickets', () => {
  it('issues a short-lived ticket for the configured demo user', async () => {
    const clerk = fakeClerk([{ id: 'user_demo' }]);

    const ticket = await createDemoTicket({ demoEmail: 'demo@finbrain.dev', clerk });

    expect(ticket).toBe('ticket-123');
    expect(clerk.users.getUserList).toHaveBeenCalledWith({ emailAddress: ['demo@finbrain.dev'] });
    const { userId, expiresInSeconds } = clerk.signInTokens.createSignInToken.mock.calls[0][0];
    expect(userId).toBe('user_demo');
    // Long enough to survive a slow page, short enough that a leaked ticket is useless.
    expect(expiresInSeconds).toBeLessThanOrEqual(300);
  });

  // The endpoint is public. With no demo configured it must not become a way
  // to mint sessions for whoever happens to be first in the user list.
  it('is unavailable when no demo email is configured', async () => {
    const clerk = fakeClerk([{ id: 'user_real' }]);

    await expect(createDemoTicket({ demoEmail: undefined, clerk })).rejects.toBeInstanceOf(DemoUnavailableError);
    await expect(createDemoTicket({ demoEmail: '  ', clerk })).rejects.toBeInstanceOf(DemoUnavailableError);
    expect(clerk.signInTokens.createSignInToken).not.toHaveBeenCalled();
  });

  it('is unavailable when Clerk is not configured', async () => {
    await expect(createDemoTicket({ demoEmail: 'demo@finbrain.dev', clerk: null })).rejects.toBeInstanceOf(
      DemoUnavailableError,
    );
  });

  it('is unavailable when the demo user does not exist in Clerk', async () => {
    const clerk = fakeClerk([]);

    await expect(createDemoTicket({ demoEmail: 'demo@finbrain.dev', clerk })).rejects.toBeInstanceOf(
      DemoUnavailableError,
    );
    expect(clerk.signInTokens.createSignInToken).not.toHaveBeenCalled();
  });

  // An email lookup that matched several accounts means the configuration is
  // not pointing at one specific demo user; refusing beats guessing.
  it('refuses when the email matches more than one user', async () => {
    const clerk = fakeClerk([{ id: 'a' }, { id: 'b' }]);

    await expect(createDemoTicket({ demoEmail: 'demo@finbrain.dev', clerk })).rejects.toBeInstanceOf(
      DemoUnavailableError,
    );
  });
});

// Every visitor shares the demo account, so one visitor deleting it would
// take the demo down for everyone until it was re-created by hand.
describe('demo user protection', () => {
  it('recognises the demo account case-insensitively', () => {
    expect(isDemoUser('Demo@FinBrain.dev', 'demo@finbrain.dev ')).toBe(true);
  });

  it('protects nobody when no demo is configured', () => {
    expect(isDemoUser('someone@example.com', undefined)).toBe(false);
    expect(isDemoUser('', '')).toBe(false);
  });

  it('does not treat other users as the demo account', () => {
    expect(isDemoUser('someone@example.com', 'demo@finbrain.dev')).toBe(false);
  });
});
