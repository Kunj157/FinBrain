import { createContext, useContext } from 'react';

import type { Currency } from '@finbrain/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  avatarUrl?: string;
  currency: Currency;
  birthDate?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, name: string) => void;
  signOut: () => void;
  updateCurrency: (currency: Currency) => void;
  getToken?: () => Promise<string | null>;
  refreshProfile?: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isSignedIn: false,
  signIn: () => {},
  signOut: () => {},
  updateCurrency: () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
