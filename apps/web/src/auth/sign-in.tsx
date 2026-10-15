import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { AuthShell, authInput } from '@/components/auth/auth-shell';

function DevSignIn() {
  const navigate = useNavigate();
  const { signIn, isSignedIn } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSignedIn) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const name = email.split('@')[0].replace(/[^a-zA-Z ]/g, ' ');
    signIn(email, name);
    navigate('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="signin-email" className="text-sm font-medium text-foreground">Email</label>
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className={authInput}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="signin-password" className="text-sm font-medium text-foreground">Password</label>
        <input
          id="signin-password"
          type="password"
          placeholder="Enter your password"
          className={authInput}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <a href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign up
        </a>
      </div>
    </form>
  );
}

function ClerkSignInPage() {
  const navigate = useNavigate();
  const { isSignedIn, isLoading } = useAuth();
  const [ClerkSignIn, setClerkSignIn] = useState<any>(null);

  useEffect(() => {
    import('@clerk/clerk-react').then((m) => {
      setClerkSignIn(() => m.SignIn);
    });
  }, []);

  if (isSignedIn) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  if (isLoading || !ClerkSignIn) {
    return <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>;
  }

  return (
    <div className="flex justify-center">
      <ClerkSignIn routing="hash" signUpUrl="/sign-up" afterSignInUrl="/dashboard" />
    </div>
  );
}

export default function SignIn() {
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your AI-powered personal finance co-pilot."
      footer="By signing in, you agree to our Terms of Service and Privacy Policy"
    >
      {hasClerkKey ? <ClerkSignInPage /> : <DevSignIn />}
    </AuthShell>
  );
}
