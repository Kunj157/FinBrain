import { type ReactNode, useState, useEffect, useCallback } from 'react';
import { AuthContext, type AuthUser } from '@/hooks/use-auth';
import type { Currency } from '@finbrain/shared';

const DEV_USER: AuthUser = {
  id: 'dev-user-001',
  email: 'dev@finbrain.ai',
  name: 'Kunj Patel',
  avatarUrl: undefined,
  currency: 'USD',
};

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedCurrency = localStorage.getItem('finbrain-currency') as Currency | null;
    setUser({ ...DEV_USER, currency: storedCurrency || 'USD' });
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
    <AuthContext.Provider value={{ user, isLoading: false, isSignedIn: !!user, signIn, signOut, updateCurrency }}>
      {children}
    </AuthContext.Provider>
  );
}
