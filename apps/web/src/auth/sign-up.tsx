import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { AuthShell, authInput } from '@/components/auth/auth-shell';

function DevSignUp() {
  const navigate = useNavigate();
  const { signIn, isSignedIn } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSignedIn) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const name = `${firstName} ${lastName}`.trim();
    signIn(email, name);
    navigate('/onboarding');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="signup-first" className="text-sm font-medium text-foreground">First Name</label>
          <input
          id="signup-first"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            className={authInput}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="signup-last" className="text-sm font-medium text-foreground">Last Name</label>
          <input
          id="signup-last"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            className={authInput}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</label>
        <input
          id="signup-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={authInput}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</label>
        <input
          id="signup-password"
          type="password"
          required
          placeholder="Create a strong password"
          className={authInput}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </a>
      </div>
    </form>
  );
}

function ClerkSignUpPage() {
  const navigate = useNavigate();
  const { isSignedIn, isLoading } = useAuth();
  const [ClerkSignUp, setClerkSignUp] = useState<any>(null);

  useEffect(() => {
    import('@clerk/clerk-react').then((m) => {
      setClerkSignUp(() => m.SignUp);
    });
  }, []);

  if (isSignedIn) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  if (isLoading || !ClerkSignUp) {
    return <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>;
  }

  return (
    <div className="flex justify-center">
      <ClerkSignUp routing="hash" signInUrl="/sign-in" afterSignUpUrl="/dashboard" />
    </div>
  );
}

export default function SignUp() {
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  return (
    <AuthShell title="Create your account" subtitle="Start your AI-powered financial journey in two minutes.">
      {hasClerkKey ? <ClerkSignUpPage /> : <DevSignUp />}
    </AuthShell>
  );
}
