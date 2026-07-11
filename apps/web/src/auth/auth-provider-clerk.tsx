import { type ReactNode, useState, useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { AuthContext, type AuthUser } from '@/hooks/use-auth';
import type { Currency } from '@finbrain/shared';

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut, getToken } = useClerkAuth();

  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!clerkLoaded) return;

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
    } else {
      localStorage.removeItem('clerk-db-jwt');
      setUser(null);
    }
  }, [clerkLoaded, clerkUser, getToken]);

  const signOut = useCallback(() => {
    clerkSignOut();
    localStorage.removeItem('clerk-db-jwt');
    setUser(null);
  }, [clerkSignOut]);

  const updateCurrency = useCallback((currency: Currency) => {
    localStorage.setItem('finbrain-currency', currency);
    setUser((prev) => (prev ? { ...prev, currency } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !clerkLoaded,
        isSignedIn: !!user,
        signIn: () => {},
        signOut,
        updateCurrency,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
