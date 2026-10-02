import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

// config.ts reads process.env at module load, so each case needs a fresh
// module registry rather than a shared import.
const CONFIG_KEYS = ['NODE_ENV', 'DATABASE_URL', 'CLERK_SECRET_KEY', 'DEV_MODE'];

async function loadConfig(env: Record<string, string | undefined>) {
  const previous = { ...process.env };
  // The developer's .env is loaded into this process, so every key config
  // reads is cleared first — otherwise a local DEV_MODE=true leaks in and the
  // case under test is not the case being asserted.
  for (const key of CONFIG_KEYS) delete process.env[key];
  for (const [k, v] of Object.entries(env)) {
    if (v !== undefined) process.env[k] = v;
  }
  // config.ts captures env at module scope, so the registry is reset rather
  // than cache-busting the specifier (a query string confuses esbuild's loader).
  // assertProductionConfig reads process.env when called, not at import, so
  // the environment must stay in place until the assertion has run. afterEach
  // restores it.
  void previous;
  vi.resetModules();
  return import('../config');
}

describe('production configuration', () => {
  const original = { ...process.env };
  beforeEach(() => { process.env = { ...original }; });
  afterEach(() => { process.env = { ...original }; });

  // A deploy that forgot CLERK_SECRET_KEY used to authenticate every request
  // as the seeded dev user, serving that account's finances to anyone.
  it('refuses to start in production without CLERK_SECRET_KEY', async () => {
    const { assertProductionConfig } = await loadConfig({
      NODE_ENV: 'production', DATABASE_URL: 'postgres://x', CLERK_SECRET_KEY: undefined,
    });
    expect(() => assertProductionConfig()).toThrow(/CLERK_SECRET_KEY/);
  });

  it('refuses to start in production without DATABASE_URL', async () => {
    const { assertProductionConfig } = await loadConfig({
      NODE_ENV: 'production', DATABASE_URL: undefined, CLERK_SECRET_KEY: 'sk_live_x',
    });
    expect(() => assertProductionConfig()).toThrow(/DATABASE_URL/);
  });

  it('refuses to start when DEV_MODE is set in production', async () => {
    const { assertProductionConfig } = await loadConfig({
      NODE_ENV: 'production', DATABASE_URL: 'postgres://x',
      CLERK_SECRET_KEY: 'sk_live_x', DEV_MODE: 'true',
    });
    expect(() => assertProductionConfig()).toThrow(/DEV_MODE/);
  });

  it('never enables the auth bypass in production', async () => {
    const { devAuthBypassEnabled } = await loadConfig({
      NODE_ENV: 'production', DATABASE_URL: 'postgres://x', CLERK_SECRET_KEY: undefined,
    });
    expect(devAuthBypassEnabled).toBe(false);
  });

  it('starts cleanly when production is fully configured', async () => {
    const { assertProductionConfig, devAuthBypassEnabled } = await loadConfig({
      NODE_ENV: 'production', DATABASE_URL: 'postgres://x',
      CLERK_SECRET_KEY: 'sk_live_x', DEV_MODE: undefined,
    });
    expect(() => assertProductionConfig()).not.toThrow();
    expect(devAuthBypassEnabled).toBe(false);
  });

  it('still allows the bypass outside production', async () => {
    const { assertProductionConfig, devAuthBypassEnabled } = await loadConfig({
      NODE_ENV: 'development', CLERK_SECRET_KEY: undefined,
    });
    expect(() => assertProductionConfig()).not.toThrow();
    expect(devAuthBypassEnabled).toBe(true);
  });
});
