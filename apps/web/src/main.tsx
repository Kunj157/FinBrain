import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App';
import './index.css';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
      <App />
    </ClerkProvider>
  </StrictMode>,
);
