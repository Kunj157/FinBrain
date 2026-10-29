import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App';
import './index.css';
import { initErrorMonitoring, reportRenderError } from './lib/error-monitoring';

// No-op unless VITE_SENTRY_DSN is set.
void initErrorMonitoring();

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

function Root({ children }: { children: ReactNode }) {
  if (!clerkKey) return <>{children}</>;
  return (
    <ClerkProvider
      publishableKey={clerkKey}
      appearance={{
        baseTheme: dark,
        variables: {
          // Mirrors the dark theme tokens in index.css.
          colorPrimary: '#34d399',
          colorText: '#f4f4f5',
          colorBackground: '#111113',
          borderRadius: '0.75rem',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

createRoot(document.getElementById('root')!, {
  // Passing these replaces React's default console logging, so keep it.
  onUncaughtError: (error, info) => {
    console.error(error, info.componentStack);
    reportRenderError(error);
  },
  onCaughtError: (error, info) => {
    console.error(error, info.componentStack);
    reportRenderError(error);
  },
}).render(
  <StrictMode>
    <Root>
      <App />
    </Root>
  </StrictMode>,
);

// Register the service worker for PWA offline support.
//
// Production only: in dev the worker's cache sits in front of Vite's module
// graph and serves stale modules straight through HMR, which makes edits
// look like they had no effect.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
