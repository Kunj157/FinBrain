import { type ReactNode, useState, useEffect, useCallback } from 'react';
import { AuthContext, type AuthUser } from '@/hooks/use-auth';

const DEV_USER: AuthUser = {
  id: 'dev-user-001',
  email: 'dev@finbrain.ai',
  name: 'Kunj Patel',
  avatarUrl: undefined,
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  useEffect(() => {
    if (isDevMode) {
      setUser(DEV_USER);
      setIsLoading(false);
      return;
    }

    const stored = localStorage.getItem('finbrain-user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, [isDevMode]);

  const signIn = useCallback((email: string, name: string) => {
    const newUser: AuthUser = { id: crypto.randomUUID(), email, name };
    localStorage.setItem('finbrain-user', JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('finbrain-user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSignedIn: !!user,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
