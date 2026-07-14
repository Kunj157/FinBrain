import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Building2, Upload, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaidLinkButton } from '@/components/finance/plaid-link';
import { CsvImport } from '@/components/finance/csv-import';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';

type Step = 'welcome' | 'plaid' | 'csv' | 'done';

const options = [
  {
    id: 'plaid' as const,
    icon: Building2,
    title: 'Connect your bank',
    desc: 'Securely import transactions from your bank account via Plaid',
  },
  {
    id: 'csv' as const,
    icon: Upload,
    title: 'Upload a bank statement',
    desc: 'Upload a CSV or PDF export from your bank or a receipt photo',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currency = user?.currency || 'USD';
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
    <div className={`flex min-h-screen bg-background p-4 ${step === 'csv' ? 'flex-col pt-8' : 'items-center justify-center'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

      <div className={`relative w-full animate-fade-in ${step === 'csv' ? 'max-w-7xl' : 'max-w-2xl mx-auto'}`}>
        {step === 'csv' && (
          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Brain className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold">Import your data</h1>
            <p className="text-muted-foreground mt-1 text-sm">Upload a CSV or PDF export from your bank.</p>
          </div>
        )}

        {step !== 'csv' && (
          <div className="text-center mb-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Brain className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold">
              {step === 'welcome' ? 'Welcome to FinBrain' : 'Import your data'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {step === 'welcome'
                ? 'To get started, let\'s bring your financial data into FinBrain.'
                : 'Connect securely with Plaid to import your transactions.'}
            </p>
          </div>
        )}

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
          <div className="glass rounded-xl p-8 text-center space-y-6">
            <Building2 className="h-12 w-12 mx-auto text-emerald-400" />
            <p className="text-sm text-muted-foreground">
              You&apos;ll be redirected to Plaid to securely connect your bank account.
              We use sandbox mode — no real bank credentials are required for testing.
            </p>
            <div className="flex justify-center">
              <PlaidLinkButton userId={user?.id || 'anon'} onSuccess={() => setStep('done')} />
            </div>
            <button
              onClick={() => setStep('welcome')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Choose a different option
            </button>
          </div>
        )}

        {step === 'csv' && (
          <div>
            <CsvImport onComplete={() => setStep('done')} />
            <div className="text-center mt-4">
              <button
                onClick={() => setStep('welcome')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Choose a different option
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}