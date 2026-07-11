import { StrictMode, type ReactNode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

function Root({ children }: { children: ReactNode }) {
  const [Provider, setProvider] = useState<React.ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    if (!clerkKey) {
      setProvider(null);
      return;
    }
    Promise.all([
      import('@clerk/clerk-react'),
      import('@clerk/themes'),
    ]).then(([{ ClerkProvider }, { dark }]) => {
      function ClerkRoot({ children: c }: { children: ReactNode }) {
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
            {c}
          </ClerkProvider>
        );
      }
      setProvider(() => ClerkRoot);
    });
  }, []);

  return Provider ? <Provider>{children}</Provider> : <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root>
      <App />
    </Root>
  </StrictMode>,
);
