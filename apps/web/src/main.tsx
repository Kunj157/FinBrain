import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App';
import './index.css';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

function Root({ children }: { children: ReactNode }) {
  if (!clerkKey) return <>{children}</>;
  return (
    <ClerkProvider
      publishableKey={clerkKey}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#10b981',
          colorText: '#e2e8f0',
          colorBackground: '#0f172a',
          borderRadius: '0.75rem',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root>
      <App />
    </Root>
  </StrictMode>,
);
