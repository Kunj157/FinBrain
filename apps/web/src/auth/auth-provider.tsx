import { type ReactNode, useState, useEffect } from 'react';
import { DevAuthProvider } from './auth-provider-dev';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  if (isDevMode || !hasClerkKey) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }

  return <ClerkLazyProvider>{children}</ClerkLazyProvider>;
}

function ClerkLazyProvider({ children }: AuthProviderProps) {
  const [Provider, setProvider] = useState<typeof import('./auth-provider-clerk').ClerkAuthProvider | null>(null);

  useEffect(() => {
    import('./auth-provider-clerk').then((m) => setProvider(() => m.ClerkAuthProvider));
  }, []);

  if (!Provider) {
    return <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
    </div>;
  }

  return <Provider>{children}</Provider>;
}
