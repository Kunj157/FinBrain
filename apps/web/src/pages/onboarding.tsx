import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, ArrowRight, Check, Shield, Eye, Lock,
  Search, CreditCard, Wallet, PiggyBank,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaidLinkButton } from '@/components/finance/plaid-link';
import { useAuth } from '@/hooks/use-auth';

type Step = 'welcome' | 'connect' | 'done';

const STEPS = ['Welcome', 'Connect', 'Done'];

const FEATURES = [
  { icon: Wallet, title: 'Track net worth', desc: 'See all accounts in one place' },
  { icon: CreditCard, title: 'Track spending', desc: 'Every transaction, categorized' },
  { icon: PiggyBank, title: 'Budget smarter', desc: 'Set limits and stay on track' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');

  const handleComplete = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto text-center animate-fade-in px-4">

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const stepIndex = step === 'welcome' ? 0 : step === 'connect' ? 1 : 2;
            const isActive = i <= stepIndex;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.04] text-muted-foreground border border-white/[0.06]'
                }`}>
                  {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 h-px transition-colors ${
                    i < stepIndex ? 'bg-emerald-500/30' : 'bg-white/[0.06]'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Welcome */}
        {step === 'welcome' && (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Brain className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Welcome to FinBrain</h1>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm">
                The modern way to manage your money. Connect your accounts and
                FinBrain will do the heavy lifting.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-left">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <f.icon className="h-4.5 w-4.5 text-emerald-400" />
                  </div>
                  <p className="text-xs font-medium">{f.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            <Button onClick={() => setStep('connect')} className="w-full gap-2">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Connect bank */}
        {step === 'connect' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Connect your bank</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Search for your bank or credit card to get started.
              </p>
            </div>

            <div className="glass rounded-xl p-6 space-y-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for your bank..."
                  className="pl-10"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.target.blur();
                    // Trigger Plaid directly on focus
                    const btn = document.querySelector('[data-plaid-trigger]') as HTMLButtonElement;
                    btn?.click();
                  }}
                  readOnly
                />
              </div>

              <div className="flex justify-center">
                <div data-plaid-trigger>
                  <PlaidLinkButton userId={user?.id || 'anon'} onSuccess={() => setStep('done')} />
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-center gap-6 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    <span>256-bit encryption</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />
                    <span>Read-only access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3" />
                    <span>Powered by Plaid</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('welcome')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">You&apos;re all set!</h1>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm">
                Your accounts are connected and your transactions are being imported.
                FinBrain will automatically categorize everything for you.
              </p>
            </div>

            <Button onClick={handleComplete} className="w-full gap-2">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Skip */}
        {step !== 'done' && (
          <button
            onClick={handleComplete}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
