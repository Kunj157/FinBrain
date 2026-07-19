import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Building2, Upload, ArrowRight, Check, Lock, Eye, Shield, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaidLinkButton } from '@/components/finance/plaid-link';
import { CsvImport } from '@/components/finance/csv-import';
import { useAuth } from '@/hooks/use-auth';

type Step = 'welcome' | 'plaid' | 'csv' | 'done';

const options = [
  {
    id: 'plaid' as const,
    icon: Building2,
    title: 'Connect your bank',
    desc: 'Securely sync transactions from 15,000+ institutions',
  },
  {
    id: 'csv' as const,
    icon: Upload,
    title: 'Upload a bank statement',
    desc: 'Import a CSV or PDF export from your bank',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [selected, setSelected] = useState<string | null>(null);

  const handleComplete = () => {
    navigate('/dashboard');
  };

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-4 animate-fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold">You&apos;re all set!</h2>
          <p className="text-muted-foreground mt-2">
            FinBrain is now analyzing your data. Check back soon for personalized insights.
          </p>
          <Button onClick={handleComplete} className="mt-8 gap-2">
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto animate-fade-in">
        {step !== 'welcome' && (
          <button
            onClick={() => setStep('welcome')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Brain className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold">
            {step === 'welcome' && 'Welcome to FinBrain'}
            {step === 'plaid' && 'Connect your bank'}
            {step === 'csv' && 'Upload your statement'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
            {step === 'welcome' && 'Bring your financial data into FinBrain to get started.'}
            {step === 'plaid' && 'Securely sync your transactions from thousands of institutions.'}
            {step === 'csv' && 'Upload a CSV or PDF export from your bank.'}
          </p>
        </div>

        {step === 'welcome' && (
          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setSelected(opt.id); setStep(opt.id); }}
                className="w-full flex items-center gap-4 glass rounded-xl p-5 card-hover text-left group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] group-hover:bg-emerald-500/10 transition-colors">
                  <opt.icon className="h-6 w-6 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{opt.title}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {step === 'plaid' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <PlaidLinkButton userId={user?.id || 'anon'} onSuccess={() => setStep('done')} />
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/50">
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>256-bit encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>Read-only access</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Never stored</span>
              </div>
            </div>
          </div>
        )}

        {step === 'csv' && (
          <div>
            <CsvImport onComplete={() => setStep('done')} />
          </div>
        )}

      </div>
    </div>
  );
}