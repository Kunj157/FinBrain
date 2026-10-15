import { useState, useEffect } from 'react';
import { Plus, Building2, Wallet, CreditCard, PiggyBank, TrendingUp, TrendingDown, Home, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/finance/stat-card';
import { InView } from '@/components/motion/in-view';
import { Select } from '@/components/ui/select';
import { NetWorthTrend } from '@/components/finance/net-worth-trend';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Account, NetWorthData, Currency as SharedCurrency } from '@finbrain/shared';

const ACCOUNT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  loan: CreditCard,
  investment: TrendingUp,
  real_estate: Home,
  other: Building2,
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit Card',
  loan: 'Loan',
  investment: 'Investment',
  real_estate: 'Real Estate',
  other: 'Other',
};

/** Liabilities carry the negative tone; everything else reads as an asset. */
const LIABILITY_TYPES = new Set(['credit', 'loan']);

const fieldClass =
  'w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15';

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'investment', label: 'Investment' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

export default function AccountsPage() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'checking', balance: 0, institution: '' });

  const fetchData = async () => {
    try {
      const [acctsRes, nwRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/accounts/net-worth'),
      ]);
      setAccounts(acctsRes.data.data);
      setNetWorth(nwRes.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      await api.post('/accounts', { ...form, balance: Number(form.balance) });
      await fetchData();
      setShowForm(false);
      setForm({ name: '', type: 'checking', balance: 0, institution: '' });
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading accounts">
        <CardSkeleton lines={0} className="h-16 w-72 border-0 bg-transparent p-0 shadow-none" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} lines={0} className="h-[150px]" />)}
        </div>
        <CardSkeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Accounts"
        description={`${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        }
      />

      {netWorth && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Net Worth" value={netWorth.netWorth} icon={Wallet} variant={netWorth.netWorth >= 0 ? 'positive' : 'negative'} currency={currency} />
          <StatCard title="Total Assets" value={netWorth.totalAssets} icon={TrendingUp} variant="positive" currency={currency} />
          <StatCard title="Total Liabilities" value={netWorth.totalLiabilities} icon={TrendingDown} variant="negative" currency={currency} />
        </div>
      )}

      {accounts.length > 0 && (
        <InView>
          <Card>
            <CardContent className="pt-0">
              <NetWorthTrend currency={currency} />
            </CardContent>
          </Card>
        </InView>
      )}

      {accounts.length === 0 && (
        <Card>
          <EmptyState
            icon={Building2}
            title="No accounts yet"
            description="Add a checking, savings, credit or loan account to start tracking your net worth."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Account
              </Button>
            }
          />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acct, i) => {
          const Icon = ACCOUNT_TYPE_ICONS[acct.type] || Building2;
          const liability = LIABILITY_TYPES.has(acct.type);
          return (
            <InView key={acct.id} index={i}>
              <Card className="group h-full overflow-hidden card-hover">
                {/* A tinted band along the top marks assets and liabilities apart. */}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-1 ${liability ? 'bg-gradient-to-r from-negative/70 to-negative/10' : 'bg-gradient-to-r from-primary/70 to-accent/40'}`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${liability ? 'bg-negative/10 text-negative ring-negative/20' : 'bg-primary/10 text-primary ring-primary/20'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{acct.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{acct.institution || ACCOUNT_TYPE_LABELS[acct.type]}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border bg-foreground/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[acct.type]}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Balance</p>
                <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${acct.balance >= 0 ? 'text-foreground' : 'text-negative'}`}>
                  {formatCurrency(acct.balance, acct.currency || currency)}
                </p>
              </Card>
            </InView>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md animate-in fade-in-0" onClick={() => setShowForm(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="account-form-title" className="w-full max-w-md rounded-2xl border bg-popover shadow-float [background-image:var(--sheen)] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-5">
              <h2 id="account-form-title" className="text-lg font-semibold tracking-tight">Add Account</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Main Checking"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Type</label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
                  options={ACCOUNT_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Balance</label>
                <input
                  type="number"
                  value={form.balance}
                  onChange={(e) => setForm((f) => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Institution</label>
                <input
                  type="text"
                  value={form.institution}
                  onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                  placeholder="e.g. Chase"
                  className={fieldClass}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="button" className="flex-1 gap-2" onClick={handleSave} disabled={!form.name.trim()}>
                  <Check className="h-4 w-4" />
                  Add Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
