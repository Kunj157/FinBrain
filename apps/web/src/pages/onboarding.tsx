import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Building2, Upload, Database, ArrowRight, Check, Loader2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaidLinkButton } from '@/components/finance/plaid-link';
import { CsvImport } from '@/components/finance/csv-import';
import { localStore } from '@/lib/store';
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
    title: 'Upload a CSV file',
    desc: 'Export your transactions from your bank and upload the file',
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
              ? 'Upload a CSV export from your bank.'
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
              <PlaidLinkButton userId="test-user" onSuccess={() => setStep('done')} />
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
              DevBank is a local mock banking service running in Docker. It provides
              realistic synthetic data including scheduled payments, random purchases,
              and even fraud scenarios for testing.
            </p>
            {devbankStatus === 'checking' && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking DevBank status...
              </div>
            )}
            {devbankStatus === 'unavailable' && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-400">
                DevBank is not running. Start it with <code className="text-xs bg-white/[0.04] px-1.5 py-0.5 rounded">docker compose up devbank</code>
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
                        const mapped = txns.data.map((t: any, i: number) => ({
                          id: `devbank-${i}`,
                          userId: user?.id || 'sample-user',
                          type: t.type === 'credit' ? 'income' as const : 'expense' as const,
                          amount: Math.abs(t.amount),
                          currency: t.currency || 'USD',
                          description: t.description || t.merchant,
                          merchant: t.merchant,
                          categoryId: '10',
                          paymentMethod: 'other' as const,
                          date: t.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                          status: 'cleared' as const,
                          isRecurring: false,
                          createdAt: t.created_at || new Date().toISOString(),
                          updatedAt: t.created_at || new Date().toISOString(),
                        }));
                        localStore.setTransactions(mapped);
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
              onClick={() => {
                setGenerating(true);
                setTimeout(() => {
                  const data = generateSampleData(currency);
                  localStore.setTransactions(data);
                  setGenerating(false);
                  setStep('done');
                }, 1500);
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