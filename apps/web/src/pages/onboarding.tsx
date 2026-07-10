import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Building2, Upload, Database, ArrowRight, Check, Loader2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaidLinkButton } from '@/components/finance/plaid-link';
import { CsvImport } from '@/components/finance/csv-import';
import { generateSampleData } from '@/lib/sample-data';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';

type Step = 'welcome' | 'plaid' | 'csv' | 'sample' | 'devbank' | 'done';

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
  {
    id: 'devbank' as const,
    icon: Server,
    title: 'Simulated bank (DevBank)',
    desc: 'Connect to a local mock bank with synthetic data and fraud scenarios',
  },
  {
    id: 'sample' as const,
    icon: Database,
    title: 'Try sample data',
    desc: 'Generate realistic synthetic transactions to explore FinBrain',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currency = user?.currency || 'USD';
  const [step, setStep] = useState<Step>('welcome');
  const [selected, setSelected] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [devbankStatus, setDevbankStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
  const [devbankError, setDevbankError] = useState<string | null>(null);

  const handleComplete = () => {
    navigate('/');
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

      <div className="relative w-full max-w-2xl animate-fade-in">
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
              : selected === 'plaid'
              ? 'Connect securely with Plaid to import your transactions.'
              : selected === 'csv'
              ? 'Upload a CSV or PDF export from your bank.'
              : selected === 'devbank'
              ? 'Connect to DevBank — a local mock bank running via Docker.'
              : 'Generate sample data to explore the dashboard.'}
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
          <div className="glass rounded-xl p-6">
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

        {step === 'devbank' && (
          <div className="glass rounded-xl p-8 text-center space-y-6">
            <Server className="h-12 w-12 mx-auto text-emerald-400" />
            <p className="text-sm text-muted-foreground">
              DevBank provides realistic synthetic banking data (scheduled payments,
              random purchases, fraud scenarios). It needs to be built from source:
            </p>
            <pre className="text-xs text-left bg-white/[0.03] rounded-lg p-3 border border-white/[0.06] overflow-x-auto">
              git clone https://github.com/ranjankumar-gh/devbanksdk.git
              cd devbanksdk/docker && docker compose up -d
            </pre>
            {devbankStatus === 'checking' && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking DevBank status...
              </div>
            )}
            {devbankStatus === 'unavailable' && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-400">
                DevBank is not running. Build it from source (see above) or use the <strong>Sample Data</strong> option instead.
              </div>
            )}
            {devbankError && (
              <div className="text-sm text-rose-400">{devbankError}</div>
            )}
            <Button
              onClick={async () => {
                setDevbankStatus('checking');
                setDevbankError(null);
                try {
                  const { data } = await api.get('/devbank/health');
                  if (data.data.status === 'connected') {
                    setDevbankStatus('available');
                    await api.post('/devbank/setup', { name: user?.name || 'Test User', email: user?.email || 'test@finbrain.ai' });
                    const { data: accts } = await api.get(`/devbank/accounts/${data.data.customerId || ''}`);
                    const accountId = Array.isArray(accts.data) ? accts.data[0]?.id : null;
                    setGenerating(true);
                    if (accountId) {
                      const { data: txns } = await api.get(`/devbank/transactions/${accountId}?limit=200`);
                      if (txns.data) {
                        const items = txns.data.map((t: any) => ({
                          type: t.type === 'credit' ? 'income' : 'expense',
                          amount: Math.abs(t.amount),
                          currency: t.currency || 'USD',
                          description: t.description || t.merchant,
                          merchant: t.merchant,
                          categoryId: '10',
                          paymentMethod: 'other',
                          date: t.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                          status: 'cleared',
                          isRecurring: false,
                        }));
                        await api.post('/transactions/bulk', { items });
                      }
                    }
                    setGenerating(false);
                    setStep('done');
                  } else {
                    setDevbankStatus('unavailable');
                  }
                } catch {
                  setDevbankStatus('unavailable');
                }
              }}
              className="gap-2"
              disabled={devbankStatus === 'checking' || generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Server className="h-4 w-4" />
              )}
              {generating ? 'Importing data...' : devbankStatus === 'available' ? 'Import from DevBank' : 'Check & Connect'}
            </Button>
            <button
              onClick={() => setStep('welcome')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Choose a different option
            </button>
          </div>
        )}

        {step === 'sample' && (
          <div className="glass rounded-xl p-8 text-center space-y-6">
            <Database className="h-12 w-12 mx-auto text-emerald-400" />
            <p className="text-sm text-muted-foreground">
              We&apos;ll generate 3 months of realistic transactions — salary deposits,
              bills, coffee runs, shopping, and more. You can edit or delete anything later.
            </p>
            <Button
              onClick={async () => {
                setGenerating(true);
                const data = generateSampleData(currency);
                try {
                  await api.post('/transactions/bulk', { items: data.map((t) => ({
                    type: t.type,
                    amount: t.amount,
                    currency: t.currency,
                    description: t.description,
                    merchant: t.merchant,
                    categoryId: t.categoryId,
                    paymentMethod: t.paymentMethod,
                    date: t.date,
                    status: t.status,
                    isRecurring: t.isRecurring,
                  })) });
                } catch {
                  // silent
                }
                setGenerating(false);
                setStep('done');
              }}
              className="gap-2"
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate sample data'}
            </Button>
            <button
              onClick={() => setStep('welcome')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Choose a different option
            </button>
          </div>
        )}
      </div>
    </div>
  );
}