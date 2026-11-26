import { type ReactNode, useState, useEffect, useCallback } from 'react';
import { AuthContext, type AuthUser } from '@/hooks/use-auth';
import type { Currency } from '@finbrain/shared';

const DEMO = import.meta.env.VITE_DEMO === '1';

const DEV_USER: AuthUser = {
  id: DEMO ? 'demo-user' : 'dev-user-001',
  email: DEMO ? 'demo@finbrain.app' : 'dev@finbrain.ai',
  name: DEMO ? 'Demo User' : 'Kunj Patel',
  username: DEMO ? 'demo' : 'kunj',
  avatarUrl: undefined,
  currency: 'USD',
};

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedCurrency = localStorage.getItem('finbrain-currency') as Currency | null;
    setUser({ ...DEV_USER, currency: storedCurrency || 'USD' });
    setIsLoading(false);
  }, []);

  const signIn = useCallback((email: string, name: string) => {
    const newUser: AuthUser = { id: crypto.randomUUID(), email, name, currency: 'USD' };
    localStorage.setItem('finbrain-user', JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('finbrain-user');
    localStorage.removeItem('finbrain-currency');
    setUser(null);
  }, []);

  const updateCurrency = useCallback((currency: Currency) => {
    localStorage.setItem('finbrain-currency', currency);
    setUser((prev) => (prev ? { ...prev, currency } : null));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isSignedIn: !!user, signIn, signOut, updateCurrency }}>
      {children}
    </AuthContext.Provider>
  );
}
