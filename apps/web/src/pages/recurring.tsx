import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Repeat,
  X,
  Check,
  Pencil,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency, RecurringPattern, RecurringSummary, Category } from '@finbrain/shared';

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  biweekly: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  monthly: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  quarterly: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  yearly: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const SNOOZE_OPTIONS = [
  { value: '1week', label: '1 Week' },
  { value: '2weeks', label: '2 Weeks' },
  { value: '1month', label: '1 Month' },
] as const;

export default function Recurring() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [summary, setSummary] = useState<RecurringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingPattern, setEditingPattern] = useState<RecurringPattern | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, catRes] = await Promise.all([
        api.get('/recurring'),
        api.get('/categories'),
      ]);
      setPatterns(recRes.data.data.patterns);
      setSummary(recRes.data.data.summary);
      setCategories(catRes.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = new Date();
  const activePatterns = patterns.filter(p => p.isActive !== false && !p.isSnoozed);
  const snoozedPatterns = patterns.filter(p => p.isSnoozed);
  const inactivePatterns = patterns.filter(p => p.isActive === false);

  const upcomingPatterns = activePatterns.filter(p => {
    const next = new Date(p.nextExpectedDate);
    return next >= now;
  });
  const overduePatterns = activePatterns.filter(p => {
    const next = new Date(p.nextExpectedDate);
    return next < now;
  });

  const handleMarkPaid = async (id: string) => {
    try {
      await api.post(`/recurring/${id}/mark-paid`);
      toast.success('Marked as paid, next due date updated');
      fetchData();
    } catch {
      toast.error('Failed to mark as paid');
    }
  };

  const handleSnooze = async (id: string, duration: string) => {
    try {
      await api.post(`/recurring/${id}/snooze`, { duration });
      toast.success('Pattern snoozed');
      fetchData();
    } catch {
      toast.error('Failed to snooze pattern');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.post(`/recurring/${id}/dismiss`);
      toast.success('Pattern dismissed');
      fetchData();
    } catch {
      toast.error('Failed to dismiss pattern');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/recurring/${id}/restore`);
      toast.success('Pattern restored');
      fetchData();
    } catch {
      toast.error('Failed to restore pattern');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurring Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detected bills and subscriptions from your transaction history
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Monthly Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(summary.totalMonthlyCost, currency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" /> Active Recurring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Due This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.upcomingThisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.totalTransactions}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-10 w-10 text-muted-foreground/30 mx-auto animate-spin" />
        </div>
      ) : patterns.length === 0 ? (
        <div className="py-16 text-center">
          <Repeat className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">No recurring transactions detected</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Import more transactions to detect recurring patterns
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {overduePatterns.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Overdue ({overduePatterns.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overduePatterns.map(p => (
                  <PatternCard
                    key={p.id}
                    pattern={p}
                    currency={currency}
                    expanded={expandedId === p.id}
                    onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    onMarkPaid={() => handleMarkPaid(p.id)}
                    onSnooze={(dur) => handleSnooze(p.id, dur)}
                    onDismiss={() => handleDismiss(p.id)}
                    onEdit={() => setEditingPattern(p)}
                    isOverdue
                  />
                ))}
              </div>
            </div>
          )}

          {upcomingPatterns.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Upcoming ({upcomingPatterns.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingPatterns.map(p => (
                  <PatternCard
                    key={p.id}
                    pattern={p}
                    currency={currency}
                    expanded={expandedId === p.id}
                    onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    onMarkPaid={() => handleMarkPaid(p.id)}
                    onSnooze={(dur) => handleSnooze(p.id, dur)}
                    onDismiss={() => handleDismiss(p.id)}
                    onEdit={() => setEditingPattern(p)}
                  />
                ))}
              </div>
            </div>
          )}

          {snoozedPatterns.length > 0 && (
            <div>
              <button
                onClick={() => setShowSnoozed(!showSnoozed)}
                className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2 hover:text-foreground transition-colors"
              >
                {showSnoozed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Snoozed ({snoozedPatterns.length})
              </button>
              {showSnoozed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {snoozedPatterns.map(p => (
                    <PatternCard
                      key={p.id}
                      pattern={p}
                      currency={currency}
                      expanded={expandedId === p.id}
                      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      onMarkPaid={() => handleMarkPaid(p.id)}
                      onSnooze={(dur) => handleSnooze(p.id, dur)}
                      onDismiss={() => handleDismiss(p.id)}
                      onEdit={() => setEditingPattern(p)}
                      isSnoozed
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {inactivePatterns.length > 0 && (
            <div>
              <button
                onClick={() => setShowDismissed(!showDismissed)}
                className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2 hover:text-foreground transition-colors"
              >
                {showDismissed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Dismissed ({inactivePatterns.length})
              </button>
              {showDismissed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactivePatterns.map(p => (
                    <PatternCard
                      key={p.id}
                      pattern={p}
                      currency={currency}
                      expanded={expandedId === p.id}
                      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      onMarkPaid={() => handleMarkPaid(p.id)}
                      onSnooze={(dur) => handleSnooze(p.id, dur)}
                      onDismiss={() => handleDismiss(p.id)}
                      onRestore={() => handleRestore(p.id)}
                      onEdit={() => setEditingPattern(p)}
                      isDismissed
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editingPattern && (
        <EditPatternForm
          pattern={editingPattern}
          categories={categories}
          onClose={() => setEditingPattern(null)}
          onSave={() => { setEditingPattern(null); fetchData(); }}
        />
      )}
    </div>
  );
}

function PatternCard({
  pattern,
  currency,
  expanded,
  onToggle,
  onMarkPaid,
  onSnooze,
  onDismiss,
  onRestore,
  onEdit,
  isOverdue = false,
  isSnoozed = false,
  isDismissed = false,
}: {
  pattern: RecurringPattern;
  currency: SharedCurrency;
  expanded: boolean;
  onToggle: () => void;
  onMarkPaid: () => void;
  onSnooze: (duration: string) => void;
  onDismiss: () => void;
  onRestore?: () => void;
  onEdit: () => void;
  isOverdue?: boolean;
  isSnoozed?: boolean;
  isDismissed?: boolean;
}) {
  const daysUntil = Math.ceil(
    (new Date(pattern.nextExpectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
  const annualCost = pattern.monthlyCost * 12;

  return (
    <Card
      className={`group card-hover cursor-pointer ${isDismissed ? 'opacity-50' : isSnoozed ? 'opacity-70' : ''} ${isOverdue ? 'border-amber-500/30' : ''}`}
      onClick={onToggle}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">{pattern.merchant}</CardTitle>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{pattern.description}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${FREQUENCY_COLORS[pattern.frequency]}`}>
              {FREQUENCY_LABELS[pattern.frequency]}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: pattern.categoryColor }}
          />
          <span className="text-xs text-muted-foreground">{pattern.categoryName}</span>
          {isSnoozed && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">Snoozed</span>
          )}
          {isDismissed && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">Dismissed</span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-semibold">{formatCurrency(pattern.avgAmount, currency)}</span>
          <span className="text-xs text-muted-foreground">
            {pattern.transactionCount}x
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>~{formatCurrency(pattern.monthlyCost, currency)}/mo</span>
          <span>{formatCurrency(annualCost, currency)}/yr</span>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={`text-xs ${isOverdue ? 'text-amber-400 font-medium' : isDueSoon ? 'text-amber-400' : 'text-muted-foreground'}`}>
            {daysUntil < 0
              ? `${Math.abs(daysUntil)} days overdue`
              : daysUntil === 0
                ? 'Due today'
                : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
          </span>
        </div>

        {!isDismissed && (
          <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onMarkPaid(); }}>
              <Check className="h-3 w-3" /> Paid
            </Button>
            <select
              onChange={(e) => { e.stopPropagation(); if (e.target.value) { onSnooze(e.target.value); e.target.value = ''; } }}
              onClick={(e) => e.stopPropagation()}
              className="h-7 px-2 text-xs rounded-md border border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground"
              defaultValue=""
            >
              <option value="" disabled>Snooze</option>
              {SNOOZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-rose-400" onClick={(e) => { e.stopPropagation(); onDismiss(); }}>
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
        )}

        {isDismissed && onRestore && (
          <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onRestore(); }}>
              <RefreshCw className="h-3 w-3" /> Restore
            </Button>
          </div>
        )}

        {expanded && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
            <p className="text-xs font-medium text-muted-foreground">History</p>
            {pattern.transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.date}</span>
                <span className="font-medium">{formatCurrency(t.amount, currency)}</span>
              </div>
            ))}
            {pattern.transactions.length > 0 && (
              <div className="flex items-center justify-between text-xs font-medium pt-1 border-t border-white/[0.04]">
                <span className="text-muted-foreground">Total spent</span>
                <span>{formatCurrency(pattern.totalSpent, currency)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditPatternForm({
  pattern,
  categories,
  onClose,
  onSave,
}: {
  pattern: RecurringPattern;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    amount: pattern.avgAmount.toString(),
    frequency: pattern.frequency,
    nextDueDate: pattern.nextExpectedDate.split('T')[0],
    categoryId: pattern.categoryId,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/recurring/${pattern.id}`, {
        amount,
        frequency: form.frequency,
        nextDueDate: form.nextDueDate,
        categoryId: form.categoryId,
      });
      toast.success('Pattern updated');
      onSave();
    } catch {
      toast.error('Failed to update pattern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="dialog" aria-modal="true" aria-labelledby="edit-pattern-title">
      <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 id="edit-pattern-title" className="text-lg font-semibold">Edit Pattern</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.04]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Amount</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Frequency</label>
            <Select
              value={form.frequency}
              onValueChange={(value) => setForm((f) => ({ ...f, frequency: value as RecurringPattern['frequency'] }))}
              options={FREQUENCIES.map(f => ({ value: f.value, label: f.label }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Next Due Date</label>
            <Input
              type="date"
              value={form.nextDueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Category</label>
            <Select
              value={form.categoryId}
              onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value }))}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
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
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
