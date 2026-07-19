import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, PiggyBank, Pencil, Trash2, X, Check, Loader2, AlertTriangle,
  Layers, LayoutGrid, Lock, Shuffle, PiggyBankIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency, Category } from '@finbrain/shared';

interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'yearly';
  bucketType: 'fixed' | 'variable' | 'savings' | null;
  startDate: string;
  endDate: string | null;
  spent: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
}

interface BucketData {
  budgeted: number;
  spent: number;
  label: string;
  budgets: Budget[];
}

type FormMode = 'create' | 'edit';
type ViewMode = 'category' | 'bucket';

const PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const BUCKET_TYPES = [
  { value: 'fixed', label: 'Fixed', icon: Lock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', description: 'Recurring bills & subscriptions' },
  { value: 'variable', label: 'Variable', icon: Shuffle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', description: 'Day-to-day spending' },
  { value: 'savings', label: 'Savings', icon: PiggyBankIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', description: 'Emergency fund & goals' },
] as const;

function BucketCard({ bucket, type }: { bucket: BucketData; type: string }) {
  const config = BUCKET_TYPES.find((b) => b.value === type);
  if (!config) return null;
  const pct = bucket.budgeted > 0 ? Math.min((bucket.spent / bucket.budgeted) * 100, 100) : 0;
  const isOver = bucket.spent > bucket.budgeted;
  const Icon = config.icon;

  return (
    <Card className="glass relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${config.bg.replace('/10', '')}`} />
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} ${config.border} border`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <div className="text-sm font-medium text-white">{config.label}</div>
            <div className="text-[10px] text-muted-foreground">{config.description}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Budgeted</div>
              <div className="text-xl font-bold text-white">{formatCurrency(bucket.budgeted, 'USD')}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Spent</div>
              <div className={`text-xl font-bold ${isOver ? 'text-rose-400' : 'text-white'}`}>
                {formatCurrency(bucket.spent, 'USD')}
              </div>
            </div>
          </div>

          <div className="relative h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                isOver ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-500' : pct >= 75 ? 'bg-amber-400' : config.color.replace('text-', 'bg-')
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{pct.toFixed(0)}% used</span>
            <span>{formatCurrency(Math.max(bucket.budgeted - bucket.spent, 0), 'USD')} remaining</span>
          </div>

          {bucket.budgets.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
              {bucket.budgets.slice(0, 4).map((b: Budget) => {
                const bPct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
                return (
                  <div key={b.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[120px]">#{b.categoryId.slice(0, 8)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bPct >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${bPct}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-12 text-right">{bPct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
              {bucket.budgets.length > 4 && (
                <div className="text-[10px] text-muted-foreground text-center">
                  +{bucket.budgets.length - 4} more
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Budgets() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [buckets, setBuckets] = useState<Record<string, BucketData> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, catRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/categories'),
      ]);
      setBudgets(budgetRes.data.data);
      if (!categories.length) setCategories(catRes.data.data);

      try {
        const bucketRes = await api.get('/budgets/buckets');
        setBuckets(bucketRes.data.data.buckets);
      } catch {
        // buckets endpoint may not exist yet
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [categories.length]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const budgetsWithCategory = useMemo(() => {
    return budgets.map((b) => ({ ...b, category: categoryMap[b.categoryId] }));
  }, [budgets, categoryMap]);

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.spent, 0), [budgets]);

  const alerts = useMemo(() => {
    const result: { id: string; name: string; pct: number; level: 'warning' | 'danger' | 'critical' }[] = [];
    for (const b of budgets) {
      if (b.amount <= 0) continue;
      const pct = (b.spent / b.amount) * 100;
      const name = categoryMap[b.categoryId]?.name || 'Unknown';
      if (pct >= 100) result.push({ id: b.id, name, pct, level: 'critical' });
      else if (pct >= 90) result.push({ id: b.id, name, pct, level: 'danger' });
      else if (pct >= 75) result.push({ id: b.id, name, pct, level: 'warning' });
    }
    return result;
  }, [budgets, categoryMap]);

  const openCreate = () => {
    setEditingBudget(null);
    setFormMode('create');
    setShowForm(true);
  };

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleDelete = useCallback(async (id: string) => {
    await api.delete(`/budgets/${id}`);
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} set
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('category')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'category' ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Category
            </button>
            <button
              onClick={() => setViewMode('bucket')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'bucket' ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Flex
            </button>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Budget
          </Button>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">Total Budgeted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(totalBudget, currency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(totalSpent, currency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}%` : '0%'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {alerts.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Budget Alerts</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.map((a) => (
                <Badge
                  key={a.id}
                  variant={a.level === 'critical' ? 'destructive' : 'secondary'}
                  className={`text-[10px] gap-1 ${
                    a.level === 'danger' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    a.level === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''
                  }`}
                >
                  {a.name}: {a.pct.toFixed(0)}%
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-10 w-10 text-muted-foreground/30 mx-auto animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="py-16 text-center">
          <PiggyBank className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">No budgets set yet</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Set your first budget
          </Button>
        </div>
      ) : viewMode === 'bucket' && buckets ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUCKET_TYPES.map((bt) => (
            <BucketCard
              key={bt.value}
              type={bt.value}
              bucket={buckets[bt.value] || { budgeted: 0, spent: 0, label: bt.label, budgets: [] }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetsWithCategory
            .filter((b) => b.category)
            .map((b) => {
              const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
              const isOver = b.spent > b.amount;
              const color = b.category?.color || '#6b7280';
              const bucketConfig = b.bucketType ? BUCKET_TYPES.find((bt) => bt.value === b.bucketType) : null;
              return (
                <Card key={b.id} className="group relative overflow-hidden card-hover">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{b.category?.name || 'Unknown'}</CardTitle>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-rose-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{b.period}</Badge>
                      {bucketConfig && (
                        <Badge variant="secondary" className={`text-[10px] ${bucketConfig.bg} ${bucketConfig.color} ${bucketConfig.border} border`}>
                          {bucketConfig.label}
                        </Badge>
                      )}
                      {isOver && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> Exceeded
                        </Badge>
                      )}
                      {!isOver && pct >= 90 && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                          90%+ used
                        </Badge>
                      )}
                      {!isOver && pct >= 75 && pct < 90 && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                          75%+ used
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-semibold">{formatCurrency(b.amount, b.currency as SharedCurrency)}</span>
                        <span className={`text-sm ${isOver ? 'text-rose-400' : 'text-muted-foreground'}`}>
                          {formatCurrency(b.spent, b.currency as SharedCurrency)} spent
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                        {[75, 90].map((threshold) => (
                          <div
                            key={threshold}
                            className="absolute top-0 bottom-0 w-px bg-white/20"
                            style={{ left: `${threshold}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pct.toFixed(0)}% used</span>
                        <span>{formatCurrency(b.remaining, b.currency as SharedCurrency)} remaining</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {showForm && (
        <BudgetForm
          mode={formMode}
          budget={editingBudget}
          categories={categories}
          existingBudgetIds={new Set(budgets.map((b) => b.categoryId))}
          currency={currency}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); fetchData(); }}
        />
      )}
    </div>
  );
}

function BudgetForm({
  mode,
  budget,
  categories,
  existingBudgetIds,
  currency,
  onClose,
  onSave,
}: {
  mode: FormMode;
  budget: Budget | null;
  categories: { id: string; name: string }[];
  existingBudgetIds: Set<string>;
  currency: SharedCurrency;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    categoryId: budget?.categoryId || '',
    amount: budget?.amount.toString() || '',
    period: budget?.period || 'monthly',
    startDate: budget?.startDate || new Date().toISOString().split('T')[0],
    bucketType: budget?.bucketType || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const availableCategories = categories.filter(
    (c) => !existingBudgetIds.has(c.id) || c.id === budget?.categoryId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.categoryId) {
      setError('Please select a category');
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        categoryId: form.categoryId,
        amount,
        period: form.period,
        startDate: form.startDate,
      };
      if (form.bucketType) {
        payload.bucketType = form.bucketType;
      }
      if (mode === 'edit' && budget) {
        await api.put(`/budgets/${budget.id}`, payload);
      } else {
        await api.post('/budgets', payload);
      }
      onSave();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save budget';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold">{mode === 'create' ? 'Set Budget' : 'Edit Budget'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.04]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Category *</label>
            <Select
              value={form.categoryId}
              onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value }))}
              options={availableCategories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select a category"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Budget Type (Flex)</label>
            <div className="grid grid-cols-3 gap-2">
              {BUCKET_TYPES.map((bt) => {
                const Icon = bt.icon;
                const isSelected = form.bucketType === bt.value;
                return (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, bucketType: isSelected ? '' : bt.value }))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                      isSelected
                        ? `${bt.bg} ${bt.border} ${bt.color}`
                        : 'border-white/[0.06] text-muted-foreground hover:border-white/[0.12]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{bt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Budget Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Period *</label>
              <Select
                value={form.period}
                onValueChange={(value) => setForm((f) => ({ ...f, period: value as 'weekly' | 'monthly' | 'yearly' }))}
                options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Start Date *</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {mode === 'create' ? 'Set Budget' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
