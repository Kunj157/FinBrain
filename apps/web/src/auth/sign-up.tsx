import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp as ClerkSignUp, useAuth } from '@clerk/clerk-react';
import { Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth as useAppAuth } from '@/hooks/use-auth';

function DevSignUp() {
  const navigate = useNavigate();
  const { signIn } = useAppAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

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
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">First Name</label>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Last Name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Password</label>
        <input
          type="password"
          required
          placeholder="Create a strong password"
          className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
        />
      </div>
      <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/sign-in" className="text-emerald-400 hover:text-emerald-300 transition-colors">
          Sign in
        </a>
      </div>
    </form>
  );
}

export default function SignUp() {
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  if (isSignedIn) {
    navigate('/', { replace: true });
    return null;
  }

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
            Start your AI-powered financial journey
          </p>
        </div>

        {!isDevMode && hasClerkKey ? (
          <ClerkSignUp routing="hash" signInUrl="/sign-in" />
        ) : (
          <DevSignUp />
        )}
      </div>
    </div>
  );
}
