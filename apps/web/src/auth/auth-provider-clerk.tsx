import { type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { AuthContext, type AuthUser } from '@/hooks/use-auth';
import type { Currency } from '@finbrain/shared';
import api, { setTokenGetter } from '@/lib/api';

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut, getToken } = useClerkAuth();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const fetching = useRef(false);

  // Register the token getter so api.ts always gets a fresh JWT
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (clerkUser) {
      fetching.current = true;

      // Wait a tick for the token getter to be registered and JWT to be available
      setTimeout(async () => {
        try {
          const { data: profile } = await api.get('/auth/profile');
          if (profile?.data) {
            setUser({
              id: profile.data.id,
              email: profile.data.email || clerkUser.primaryEmailAddress?.emailAddress || '',
              name: profile.data.username || profile.data.name || clerkUser.fullName || clerkUser.firstName || 'User',
              username: profile.data.username,
              avatarUrl: profile.data.avatarUrl || clerkUser.imageUrl,
              currency: profile.data.currency || 'USD',
              birthDate: profile.data.birthDate,
              createdAt: profile.data.createdAt,
            });
          } else {
            setUser({
              id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              name: clerkUser.fullName || clerkUser.firstName || 'User',
              avatarUrl: clerkUser.imageUrl,
              currency: 'USD',
            });
          }
        } catch {
          setUser({
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || 'User',
            avatarUrl: clerkUser.imageUrl,
            currency: 'USD',
          });
        } finally {
          setProfileReady(true);
          fetching.current = false;
        }
      }, 0);
    } else {
      setUser(null);
      setProfileReady(true);
    }
  }, [clerkLoaded, clerkUser, getToken]);

  const signOut = useCallback(() => {
    clerkSignOut({ redirectUrl: '/sign-in' });
    setUser(null);
    setProfileReady(false);
  }, [clerkSignOut]);

  const updateCurrency = useCallback((currency: Currency) => {
    localStorage.setItem('finbrain-currency', currency);
    setUser((prev) => (prev ? { ...prev, currency } : null));
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: profile } = await api.get('/auth/profile');
      if (profile?.data) {
        setUser((prev) => ({
          id: profile.data.id,
          email: profile.data.email,
          name: profile.data.username || profile.data.name || prev?.name || 'User',
          username: profile.data.username,
          avatarUrl: profile.data.avatarUrl || prev?.avatarUrl,
          currency: profile.data.currency || 'USD',
          birthDate: profile.data.birthDate,
          createdAt: profile.data.createdAt,
        }));
      }
    } catch {
      // silent
    }
  }, []);

  const isLoading = !clerkLoaded || (!!clerkUser && !profileReady);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSignedIn: !!user,
        signIn: () => {},
        signOut,
        updateCurrency,
        getToken,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
