import { useState, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Brain, Loader2, Check, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DOBSelector } from '@/components/ui/dob-selector';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /\d/.test(p) },
  { label: 'Special character', test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

type Strength = 'weak' | 'good' | 'strong';

function getStrength(password: string): { level: Strength; score: number; label: string } {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 2) return { level: 'weak', score: 25, label: 'Weak' };
  if (passed <= 3) return { level: 'good', score: 55, label: 'Good' };
  return { level: 'strong', score: 100, label: 'Strong' };
}

const strengthColors: Record<Strength, string> = {
  weak: 'bg-red-500',
  good: 'bg-amber-500',
  strong: 'bg-emerald-500',
};

const strengthTextColors: Record<Strength, string> = {
  weak: 'text-red-400',
  good: 'text-amber-400',
  strong: 'text-emerald-400',
};

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, isLoading, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => getStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!birthDate) {
      setError('Please enter your birth date');
      return;
    }
    const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 13) {
      setError('You must be at least 13 years old');
      return;
    }

    setSubmitting(true);
    try {
      await api.put('/auth/profile', { username, birthDate, password });
      await refreshProfile?.();
      navigate('/onboarding');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/sign-in" replace />;
  if (user.username) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
      <div className="relative w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Brain className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold">
            Complete your <span className="text-gradient">profile</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Welcome! Just a few more details to get started.
            {user?.email && <span className="block mt-1 text-xs opacity-70">Signed in as {user.email}</span>}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Birth Date */}
          <DOBSelector value={birthDate} onChange={setBirthDate} />

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g. john_doe"
              required
              minLength={3}
              className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
            />
            {username && (
              <p className="text-xs text-muted-foreground">
                finbrain.ai/{username}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                className="w-full h-11 px-4 pr-11 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div className="space-y-2 pt-1">
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthColors[strength.level]}`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
                <p className={`text-xs font-medium ${strengthTextColors[strength.level]}`}>
                  {strength.label}
                </p>
              </div>
            )}

            {/* Rules checklist */}
            <div className="space-y-1.5 pt-1">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password);
                return (
                  <div key={rule.label} className="flex items-center gap-2 text-xs">
                    {passed ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                    <span className={passed ? 'text-emerald-400' : 'text-muted-foreground/60'}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {submitting ? 'Saving...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
