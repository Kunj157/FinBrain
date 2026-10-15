import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, PiggyBank, Pencil, Trash2, X, Check, Loader2, AlertTriangle, Layers, Wallet, Lock, Repeat, CalendarDays, Package, type LucideIcon } from 'lucide-react';
import { ExplainViewButton } from '@/components/finance/explain-view-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/finance/stat-card';
import { ActiveHighlight } from '@/components/motion/animated-background';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { InView } from '@/components/motion/in-view';
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
  startDate: string;
  endDate: string | null;
  spent: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
  budgetMode?: string;
  bucketType?: string | null;
}

interface FlexCategory {
  categoryId: string;
  categoryName: string;
  bucketType: string;
  reason: string;
}

interface FlexPlan {
  month: string;
  fixed: Array<{ category: string; budget: number; spent: number }>;
  flexible: Array<{ category: string; budget: number; spent: number }>;
  nonMonthly: Array<{ category: string; budget: number; spent: number }>;
  suggestedCategories: FlexCategory[];
}

type FormMode = 'create' | 'edit';

const PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const BUCKET_ICONS: Record<string, LucideIcon> = {
  fixed: Lock,
  flexible: Repeat,
  non_monthly: CalendarDays,
};

const fieldClass =
  'w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15';

/** Spend against a limit: green, amber from 75%, red once exceeded. */
function progressTone(pct: number, over: boolean) {
  if (over || pct >= 100) return 'from-negative/80 to-negative shadow-[0_0_12px_hsl(var(--negative)/0.45)]';
  if (pct >= 75) return 'from-warning/80 to-warning shadow-[0_0_12px_hsl(var(--warning)/0.4)]';
  return 'from-positive/70 to-positive shadow-[0_0_12px_hsl(var(--positive)/0.35)]';
}

/** A circular gauge for overall utilisation. */
function UtilisationRing({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const shown = Math.min(pct, 100);
  const tone = pct >= 100 ? 'text-negative' : pct >= 75 ? 'text-warning' : 'text-positive';
  return (
    <svg viewBox="0 0 56 56" className={`h-14 w-14 -rotate-90 ${tone}`} aria-hidden>
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-foreground/[0.08]" />
      <circle
        cx="28" cy="28" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke="currentColor"
        strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c}
        className="transition-[stroke-dashoffset] duration-1000 ease-out"
      />
    </svg>
  );
}

const BUCKET_COLORS: Record<string, string> = {
  fixed: 'border-info/30 bg-info/5',
  flexible: 'border-primary/30 bg-primary/5',
  non_monthly: 'border-warning/30 bg-warning/5',
};

const BUCKET_HEADINGS: Record<string, { title: string; desc: string }> = {
  fixed: { title: 'Fixed Expenses', desc: 'Consistent monthly bills (rent, insurance, subscriptions)' },
  flexible: { title: 'Flexible Spending', desc: 'Variable monthly costs (groceries, dining, shopping)' },
  non_monthly: { title: 'Non-Monthly', desc: 'Quarterly, annual, or irregular expenses' },
};

export default function Budgets() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetMode, setBudgetMode] = useState<'category' | 'flex'>('category');
  const [flexPlan, setFlexPlan] = useState<FlexPlan | null>(null);
  const [flexLoading, setFlexLoading] = useState(false);

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

  const loadFlexPlan = useCallback(async () => {
    setFlexLoading(true);
    try {
      const res = await api.get('/budgets/flex/plan');
      setFlexPlan(res.data.data);
    } catch { /* silent */ }
    setFlexLoading(false);
  }, []);

  useEffect(() => {
    if (budgetMode === 'flex') loadFlexPlan();
  }, [budgetMode, loadFlexPlan]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={PiggyBank}
        title="Budgets"
        description={`${budgets.length} budget${budgets.length !== 1 ? 's' : ''} set`}
        actions={
          <>
            <ExplainViewButton viewName="Budgets" />
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Budget
            </Button>
          </>
        }
      />

      <div className="flex w-fit gap-0.5 rounded-xl border bg-surface-sunken/60 p-1" role="group" aria-label="Budget view">
        {([
          { mode: 'category' as const, label: 'Category Budgets', icon: PiggyBank },
          { mode: 'flex' as const, label: 'Flex Budgets', icon: Layers },
        ]).map((tab) => (
          <button
            key={tab.mode}
            onClick={() => setBudgetMode(tab.mode)}
            aria-pressed={budgetMode === tab.mode}
            className={`relative isolate flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${budgetMode === tab.mode ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {budgetMode === tab.mode && (
              <ActiveHighlight layoutId="budget-mode" className="rounded-lg bg-card shadow-raised ring-1 ring-border" />
            )}
            <tab.icon className="h-3.5 w-3.5" aria-hidden /> {tab.label}
          </button>
        ))}
      </div>

      {budgetMode === 'flex' ? (
        flexLoading ? (
          <div className="grid gap-4 md:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} lines={1} />)}
          </div>
        ) : flexPlan ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['fixed', 'flexible', 'non_monthly'] as const).map((bucket) => {
                const items = flexPlan[bucket === 'non_monthly' ? 'nonMonthly' : bucket === 'flexible' ? 'flexible' : 'fixed'];
                const totalBudgeted = items.reduce((s, i) => s + i.budget, 0);
                const totalSpentInBucket = items.reduce((s, i) => s + i.spent, 0);
                return (
                  <Card key={bucket} className={BUCKET_COLORS[bucket]}>
                    <CardHeader>
                      <CardTitle className="stat-label flex items-center gap-1.5">
                        <BucketIcon bucket={bucket} /> {BUCKET_HEADINGS[bucket].title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(totalBudgeted, currency)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(totalSpentInBucket, currency)} spent</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {(['fixed', 'flexible', 'non_monthly'] as const).map((bucket) => {
              const items = flexPlan[bucket === 'non_monthly' ? 'nonMonthly' : bucket === 'flexible' ? 'flexible' : 'fixed'];
              if (items.length === 0) return null;
              return (
                <Card key={bucket}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BucketIcon bucket={bucket} />
                      {BUCKET_HEADINGS[bucket].title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{BUCKET_HEADINGS[bucket].desc}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item, idx) => {
                        const pct = item.budget > 0 ? Math.min((item.spent / item.budget) * 100, 100) : 0;
                        return (
                          <div key={idx}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium">{item.category}</span>
                              <div className="flex items-center gap-2 tabular-nums">
                                <span className="text-muted-foreground">{formatCurrency(item.spent, currency)}</span>
                                <span className="font-medium">/ {formatCurrency(item.budget, currency)}</span>
                              </div>
                            </div>
                            <div className="relative h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                              <div
                                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${progressTone(pct, false)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(0)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {flexPlan.suggestedCategories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Bucket Assignments</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Based on your spending patterns, these categories have been classified:
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {flexPlan.suggestedCategories.map((sc) => (
                      <div key={sc.categoryId} className="flex items-center justify-between rounded-lg border bg-foreground/[0.02] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <BucketIcon bucket={sc.bucketType} />
                          <span className="text-sm font-medium">{sc.categoryName}</span>
                        </div>
                        <Badge variant="secondary" className="capitalize">{sc.bucketType.replace('_', ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <EmptyState icon={Layers} title="No flex budgets found" description="Set up category budgets first, then switch to flex view" />
          </Card>
        )
      ) : (
        <>
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Budgeted" value={totalBudget} icon={PiggyBank} currency={currency} />
          <StatCard title="Total Spent" value={totalSpent} icon={Wallet} variant="warning" currency={currency} />
          <div className="stat-card flex items-center justify-between gap-4">
            <div>
              <p className="stat-label">Utilization</p>
              <p className="stat-value mt-1.5 text-[1.7rem] leading-none">
                <AnimatedNumber value={totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0} from={0} format={(n) => `${Math.round(n)}%`} />
              </p>
              <p className="mt-2 text-xs text-muted-foreground">of everything you budgeted</p>
            </div>
            <UtilisationRing pct={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} />
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <Card className="border-warning/25 bg-warning/[0.06] p-4">
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
              <span className="text-sm font-medium text-warning">Budget Alerts</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.map((a) => (
                <Badge
                  key={a.id}
                  variant={a.level === 'critical' ? 'destructive' : 'secondary'}
                  className={`text-[10px] gap-1 ${
                    a.level === 'danger' ? 'bg-negative/10 text-negative border-negative/20' :
                    a.level === 'warning' ? 'bg-warning/10 text-warning border-warning/20' : ''
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading budgets">
          {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title="No budgets set yet"
            description="Give a category a monthly limit and FinBrain tracks it as you spend."
            action={
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Set your first budget
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetsWithCategory
            .filter((b) => b.category)
            .map((b) => {
              const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
              const isOver = b.spent > b.amount;
              const color = b.category?.color || 'hsl(var(--muted-foreground))';
              return (
                <InView key={b.id} index={budgetsWithCategory.indexOf(b)}>
                <Card className="group h-full overflow-hidden card-hover">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <span aria-hidden className="h-2.5 w-2.5 rounded-full ring-4 ring-foreground/[0.04]" style={{ backgroundColor: color }} />
                        {b.category?.name || 'Unknown'}
                      </CardTitle>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button onClick={() => openEdit(b)} aria-label="Edit budget" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(b.id)} aria-label="Delete budget" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">{b.period}</Badge>
                      {isOver && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> Exceeded
                        </Badge>
                      )}
                      {!isOver && pct >= 90 && (
                        <Badge variant="warning" className="text-[10px]">
                          90%+ used
                        </Badge>
                      )}
                      {!isOver && pct >= 75 && pct < 90 && (
                        <Badge variant="warning" className="text-[10px]">
                          75%+ used
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(b.amount, b.currency as SharedCurrency)}</span>
                        <span className={`text-sm tabular-nums ${isOver ? 'text-negative' : 'text-muted-foreground'}`}>
                          {formatCurrency(b.spent, b.currency as SharedCurrency)} spent
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${progressTone(pct, isOver)}`}
                          style={{ width: `${pct}%` }}
                        />
                        {[75, 90].map((threshold) => (
                          <div
                            key={threshold}
                            className="absolute top-0 bottom-0 w-px bg-foreground/20"
                            style={{ left: `${threshold}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                        <span>{pct.toFixed(0)}% used</span>
                        <span>{formatCurrency(b.remaining, b.currency as SharedCurrency)} remaining</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </InView>
              );
            })}
        </div>
      )}
      </>
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

function BucketIcon({ bucket }: { bucket: string }) {
  const Icon = BUCKET_ICONS[bucket] || Package;
  return <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
}

function BudgetForm({
  mode,
  budget,
  categories,
  existingBudgetIds,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md animate-in fade-in-0" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="budget-form-title" className="w-full max-w-md rounded-2xl border bg-popover shadow-float [background-image:var(--sheen)] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-5">
          <h2 id="budget-form-title" className="text-lg font-semibold tracking-tight">{mode === 'create' ? 'Set Budget' : 'Edit Budget'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category *</label>
            <Select
              value={form.categoryId}
              onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value }))}
              options={availableCategories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select a category"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Budget Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Period *</label>
              <Select
                value={form.period}
                onValueChange={(value) => setForm((f) => ({ ...f, period: value as 'weekly' | 'monthly' | 'yearly' }))}
                options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Start Date *</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className={fieldClass}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-negative bg-negative/10 rounded-lg px-3 py-2">
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
