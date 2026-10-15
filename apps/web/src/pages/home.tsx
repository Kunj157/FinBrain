import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Landing } from '@/components/marketing/landing';

export default function HomePage() {
  const { isSignedIn, isLoading } = useAuth();

  if (isLoading) return null;
  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <Landing
      primary={{ label: 'Get started free', href: '/sign-up' }}
      navLink={{ label: 'Sign in', href: '/sign-in' }}
    />
  );
}
