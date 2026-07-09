import { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, name: string) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isSignedIn: false,
  signIn: () => {},
  signOut: () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
