import { useState, useEffect, useCallback } from 'react';
import { Plus, Building2, Wallet, CreditCard, PiggyBank, TrendingUp, Home, Loader2, X, Check, Pencil, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { NetWorthTrend } from '@/components/finance/net-worth-trend';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Account, Category, Transaction, NetWorthData, Currency as SharedCurrency } from '@finbrain/shared';

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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountTxns, setAccountTxns] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [acctsRes, nwRes, catsRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/accounts/net-worth'),
        api.get('/categories'),
      ]);
      setAccounts(acctsRes.data.data);
      setNetWorth(nwRes.data.data);
      setCategories(catsRes.data.data);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Account name is required');
      return;
    }
    setSaving(true);
    const payload = { ...form, balance: Number(form.balance), currency: 'USD' as SharedCurrency };
    try {
      if (editingAccount) {
        const res = await api.put(`/accounts/${editingAccount.id}`, payload);
        setAccounts((prev) => prev.map((a) => (a.id === editingAccount.id ? res.data.data : a)));
        toast.success('Account updated');
      } else {
        const res = await api.post('/accounts', payload);
        setAccounts((prev) => [res.data.data, ...prev]);
        toast.success('Account added');
      }
      await fetchData();
      setShowForm(false);
      setEditingAccount(null);
      setForm({ name: '', type: 'checking', balance: 0, institution: '' });
    } catch {
      toast.error(editingAccount ? 'Failed to update account' : 'Failed to add account');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setForm({ name: account.name, type: account.type, balance: account.balance, institution: account.institution || '' });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingAccount(null);
    setForm({ name: '', type: 'checking', balance: 0, institution: '' });
    setShowForm(true);
  };

  const viewAccount = async (account: Account) => {
    setSelectedAccount(account);
    setLoadingTxns(true);
    try {
      const res = await api.get(`/accounts/${account.id}`);
      setAccountTxns(res.data.data.transactions || []);
    } catch {
      toast.error('Failed to load account transactions');
    } finally {
      setLoadingTxns(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">{accounts.length} accounts</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {netWorth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${netWorth.netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(netWorth.netWorth, currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-400">{formatCurrency(netWorth.totalAssets, currency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Total Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-rose-400">{formatCurrency(netWorth.totalLiabilities, currency)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <NetWorthTrend currency={currency} />
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <div className="py-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">No accounts yet</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add your first account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acct) => {
            const Icon = ACCOUNT_TYPE_ICONS[acct.type] || Building2;
            return (
              <Card key={acct.id} className="group cursor-pointer hover:border-white/[0.1] transition-colors" onClick={() => viewAccount(acct)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                        <Icon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium">{acct.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[acct.type]}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(acct); }}
                      className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all"
                      aria-label={`Edit ${acct.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-lg font-semibold ${acct.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(acct.balance, currency)}
                  </p>
                  {acct.institution && (
                    <p className="text-xs text-muted-foreground mt-1">{acct.institution}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingAccount(null); }} role="dialog" aria-modal="true" aria-labelledby="account-form-title">
          <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 id="account-form-title" className="text-lg font-semibold">{editingAccount ? 'Edit Account' : 'Add Account'}</h2>
              <button onClick={() => { setShowForm(false); setEditingAccount(null); }} className="p-1.5 rounded-lg hover:bg-white/[0.04]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name *</label>
                <Input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Main Checking"
                />
                {formError && <p className="text-xs text-rose-400 mt-1">{formError}</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Type</label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
                  options={ACCOUNT_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Balance</label>
                <Input
                  type="number"
                  value={form.balance}
                  onChange={(e) => setForm((f) => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Institution</label>
                <Input
                  type="text"
                  value={form.institution}
                  onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                  placeholder="e.g. Chase"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditingAccount(null); }}>Cancel</Button>
                <Button type="button" className="flex-1 gap-2" onClick={handleSave} disabled={!form.name.trim() || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editingAccount ? 'Save Changes' : 'Add Account'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAccount(null)} role="dialog" aria-modal="true" aria-labelledby="account-txns-title">
          <div className="w-full max-w-2xl mx-4 glass rounded-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
                <div>
                  <h2 id="account-txns-title" className="text-lg font-semibold">{selectedAccount.name}</h2>
                  <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[selectedAccount.type]} — {formatCurrency(selectedAccount.balance, currency)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="p-1.5 rounded-lg hover:bg-white/[0.04]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {loadingTxns ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Loading transactions...</p>
                </div>
              ) : accountTxns.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No transactions for this account</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accountTxns.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors">
                      <div>
                        <p className="text-sm font-medium">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(txn.date)} — {categories.find((c) => c.id === txn.categoryId)?.name || 'Other'}</p>
                      </div>
                      <p className={`text-sm font-semibold ${txn.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCurrency(txn.amount, currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
