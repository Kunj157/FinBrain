import { type ReactNode, useState, useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { AuthContext, type AuthUser } from '@/hooks/use-auth';
import type { Currency } from '@finbrain/shared';

const DEV_USER: AuthUser = {
  id: 'dev-user-001',
  email: 'dev@finbrain.ai',
  name: 'Kunj Patel',
  avatarUrl: undefined,
  currency: 'USD',
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut, getToken } = useClerkAuth();

  useEffect(() => {
    if (isDevMode) {
      const storedCurrency = localStorage.getItem('finbrain-currency') as Currency | null;
      setUser({ ...DEV_USER, currency: storedCurrency || 'USD' });
      setIsLoading(false);
      return;
    }

    if (!hasClerkKey || !clerkLoaded) {
      const stored = localStorage.getItem('finbrain-user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
      setIsLoading(false);
      return;
    }

    if (clerkUser) {
      getToken().then((token) => {
        if (token) localStorage.setItem('clerk-db-jwt', token);
      });
      setUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        avatarUrl: clerkUser.imageUrl,
        currency: 'USD',
      });
      setIsLoading(false);
    } else if (clerkLoaded) {
      localStorage.removeItem('clerk-db-jwt');
      setUser(null);
      setIsLoading(false);
    }
  }, [isDevMode, hasClerkKey, clerkLoaded, clerkUser, getToken]);

  const signIn = useCallback(async (_email: string, _name: string) => {
    if (isDevMode || !hasClerkKey) {
      const newUser: AuthUser = { id: crypto.randomUUID(), email: _email, name: _name, currency: 'USD' };
      localStorage.setItem('finbrain-user', JSON.stringify(newUser));
      setUser(newUser);
    }
  }, [isDevMode, hasClerkKey]);

  const signOut = useCallback(() => {
    if (!isDevMode && hasClerkKey) {
      clerkSignOut();
    }
    localStorage.removeItem('finbrain-user');
    localStorage.removeItem('finbrain-currency');
    setUser(null);
  }, [isDevMode, hasClerkKey, clerkSignOut]);

  const updateCurrency = useCallback((currency: Currency) => {
    localStorage.setItem('finbrain-currency', currency);
    setUser((prev) => (prev ? { ...prev, currency } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !isDevMode && hasClerkKey ? !clerkLoaded : isLoading,
        isSignedIn: !!user,
        signIn,
        signOut,
        updateCurrency,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
