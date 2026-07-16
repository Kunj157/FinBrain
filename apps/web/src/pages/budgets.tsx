import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, PiggyBank, Pencil, Trash2, X, Check, Loader2, AlertTriangle, ArrowRightLeft, History } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency, Category, BudgetHistory } from '@finbrain/shared';

interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string | null;
  spent: number;
  remaining: number;
  rollover: boolean;
  rolloverAmount: number;
  createdAt: string;
  updatedAt: string;
}

type FormMode = 'create' | 'edit';

const PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export default function Budgets() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [historyBudgetId, setHistoryBudgetId] = useState<string | null>(null);
  const [history, setHistory] = useState<BudgetHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, catRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/categories'),
      ]);
      setBudgets(budgetRes.data.data);
      if (!categories.length) setCategories(catRes.data.data);
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

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount + b.rolloverAmount, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.spent, 0), [budgets]);

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
    const budget = budgets.find((b) => b.id === id);
    if (!budget) return;
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    toast.success('Budget deleted', {
      action: {
        label: 'Undo',
        onClick: async () => {
          try {
            await api.post('/budgets', {
              categoryId: budget.categoryId,
              amount: budget.amount,
              period: budget.period,
              startDate: budget.startDate,
              rollover: budget.rollover,
            });
            fetchData();
            toast.success('Budget restored');
          } catch {
            toast.error('Failed to restore');
          }
        },
      },
      duration: 5000,
    });
    try {
      await api.delete(`/budgets/${id}`);
    } catch {
      setBudgets((prev) => [...prev, budget]);
      toast.error('Failed to delete budget');
    }
  }, [budgets, fetchData]);

  const loadHistory = async (budgetId: string) => {
    if (historyBudgetId === budgetId) {
      setHistoryBudgetId(null);
      setHistory([]);
      return;
    }
    setHistoryBudgetId(budgetId);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/budgets/${budgetId}/history`);
      setHistory(res.data.data);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} set
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Budget
        </Button>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetsWithCategory
            .filter((b) => b.category)
            .map((b) => {
              const effectiveBudget = b.amount + b.rolloverAmount;
              const pct = effectiveBudget > 0 ? Math.min((b.spent / effectiveBudget) * 100, 100) : 0;
              const isOver = b.spent > effectiveBudget;
              const color = b.category?.color || '#6b7280';
              return (
                <Card key={b.id} className="group relative overflow-hidden card-hover">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{b.category?.name || 'Unknown'}</CardTitle>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button onClick={() => loadHistory(b.id)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors" aria-label={`View ${b.category?.name} history`}>
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors" aria-label={`Edit ${b.category?.name} budget`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-rose-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{b.period}</Badge>
                      {isOver && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> Exceeded
                        </Badge>
                      )}
                      {b.rollover && b.rolloverAmount > 0 && (
                        <Badge variant="secondary" className="text-[10px] gap-1 text-emerald-400">
                          <ArrowRightLeft className="h-3 w-3" /> {formatCurrency(b.rolloverAmount, b.currency as SharedCurrency)} rolled
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-semibold">{formatCurrency(effectiveBudget, b.currency as SharedCurrency)}</span>
                        <span className={`text-sm ${isOver ? 'text-rose-400' : 'text-muted-foreground'}`}>
                          {formatCurrency(b.spent, b.currency as SharedCurrency)} spent
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pct.toFixed(0)}% used</span>
                        <span>{formatCurrency(b.remaining, b.currency as SharedCurrency)} remaining</span>
                      </div>
                    </div>

                    {historyBudgetId === b.id && (
                      <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <p className="text-xs font-medium text-muted-foreground mb-2">History</p>
                        {historyLoading ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                          </div>
                        ) : history.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60">No history yet</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {history.map((h) => (
                              <div key={h.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(h.recordedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </span>
                                <div className="flex gap-3">
                                  <span>{formatCurrency(h.amount, b.currency as SharedCurrency)}</span>
                                  <span className="text-rose-400">{formatCurrency(h.spent, b.currency as SharedCurrency)}</span>
                                  {h.rolloverAmount > 0 && (
                                    <span className="text-emerald-400">+{formatCurrency(h.rolloverAmount, b.currency as SharedCurrency)}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
    rollover: budget?.rollover ?? false,
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
      const payload = {
        categoryId: form.categoryId,
        amount,
        period: form.period,
        startDate: form.startDate,
        rollover: form.rollover,
      };
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

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div>
              <p className="text-sm font-medium">Rollover</p>
              <p className="text-xs text-muted-foreground">Carry unused budget to next period</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.rollover}
              onClick={() => setForm((f) => ({ ...f, rollover: !f.rollover }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.rollover ? 'bg-emerald-500' : 'bg-white/10'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.rollover ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
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
