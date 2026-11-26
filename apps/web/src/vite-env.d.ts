/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_SENTRY_DSN?: string;
  /** '1' builds the static demo: sample data in the browser, no backend. */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
