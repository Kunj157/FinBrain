import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 5173;
const API_PORT = 4000;
const BASE_URL = `http://localhost:${WEB_PORT}`;

// The suite drives the app as a signed-in user. Clerk is deliberately left
// unconfigured so the web app falls back to DevAuthProvider and the API's
// DEV_MODE bypass — otherwise every spec would need to script a hosted
// third-party sign-in flow.
const devAuthEnv = {
  VITE_CLERK_PUBLISHABLE_KEY: '',
  DEV_MODE: 'true',
};

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Financial assertions must not be racy; a retry that passes is still a
  // signal worth seeing in the report rather than silently swallowing.
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'pnpm --filter @finbrain/api dev',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: devAuthEnv,
    },
    {
      command: 'pnpm --filter @finbrain/web dev',
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: devAuthEnv,
    },
  ],
});
