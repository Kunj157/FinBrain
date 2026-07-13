import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

function DevSignIn() {
  const navigate = useNavigate();
  const { signIn, isSignedIn } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSignedIn) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const name = email.split('@')[0].replace(/[^a-zA-Z ]/g, ' ');
    signIn(email, name);
    navigate('/');
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
        />
      </div>
      <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <a href="/sign-up" className="text-emerald-400 hover:text-emerald-300 transition-colors">
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
    navigate('/', { replace: true });
    return null;
  }

  if (isLoading || !ClerkSignIn) {
    return <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>;
  }

  return (
    <div className="flex justify-center">
      <ClerkSignIn routing="hash" signUpUrl="/sign-up" afterSignInUrl="/" />
    </div>
  );
}

export default function SignIn() {
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
      <div className="relative w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Brain className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient">Fin</span>
            <span className="text-foreground">Brain</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your AI-powered personal finance co-pilot
          </p>
        </div>

        {hasClerkKey ? <ClerkSignInPage /> : <DevSignIn />}

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
