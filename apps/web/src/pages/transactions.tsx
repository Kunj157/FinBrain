import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, ArrowUpDown, Pencil, Trash2, ArrowRightLeft, X, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction, PaymentMethod, TransactionStatus, Currency as SharedCurrency, Category } from '@finbrain/shared';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
] as const;

interface Filters {
  type: string;
  categoryId: string;
  paymentMethod: string;
  search: string;
  sort: string;
  order: 'asc' | 'desc';
}

type FormMode = 'create' | 'edit';

export default function TransactionsPage() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [filters, setFilters] = useState<Filters>({ type: '', categoryId: '', paymentMethod: '', search: '', sort: 'date', order: 'desc' });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('sort', filters.sort);
      params.set('order', filters.order);
      if (filters.type) params.set('type', filters.type);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
      if (filters.search) params.set('search', filters.search);

      const [txnRes, catRes] = await Promise.all([
        api.get(`/transactions?${params}`),
        api.get('/categories'),
      ]);

      setTxns(txnRes.data.data.data);
      setTotal(txnRes.data.data.total);
      if (!categories.length) setCategories(catRes.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters, categories.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [categories]);

  const totalPages = Math.ceil(total / limit);

  const toggleSort = (field: string) => {
    setFilters((f) => ({ ...f, sort: field, order: f.sort === field && f.order === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };

  const handleDelete = useCallback(async (id: string) => {
    await api.delete(`/transactions/${id}`);
    fetchData();
  }, [fetchData]);

  const handleBulkDelete = useCallback(async () => {
    await api.delete('/transactions/bulk', { data: { ids: Array.from(selected) } });
    setSelected(new Set());
    fetchData();
  }, [selected, fetchData]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEdit = (txn: Transaction) => {
    setEditingTxn(txn);
    setFormMode('edit');
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingTxn(null);
    setFormMode('create');
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total transactions</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <select
              value={filters.type}
              onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value })); setPage(1); }}
              className="h-10 rounded-lg bg-white/[0.02] border border-white/[0.08] px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select
              value={filters.categoryId}
              onChange={(e) => { setFilters((f) => ({ ...f, categoryId: e.target.value })); setPage(1); }}
              className="h-10 rounded-lg bg-white/[0.02] border border-white/[0.08] px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filters.paymentMethod}
              onChange={(e) => { setFilters((f) => ({ ...f, paymentMethod: e.target.value })); setPage(1); }}
              className="h-10 rounded-lg bg-white/[0.02] border border-white/[0.08] px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-1">
                <Trash2 className="h-3 w-3" />
                Delete {selected.size}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-10 w-10 text-muted-foreground/30 mx-auto animate-spin" />
            </div>
          ) : txns.length === 0 ? (
            <div className="py-16 text-center">
              <ArrowRightLeft className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">No transactions found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Add your first transaction
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.size === txns.length && txns.length > 0}
                        onChange={() => {
                          if (selected.size === txns.length) setSelected(new Set());
                          else setSelected(new Set(txns.map((t) => t.id)));
                        }}
                        className="rounded border-white/[0.08] bg-white/[0.02]"
                      />
                    </th>
                    <th className="text-left px-3 py-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('date')}>
                      <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('merchant')}>
                      <span className="flex items-center gap-1">Merchant <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-muted-foreground font-medium">Description</th>
                    <th className="text-left px-3 py-3 text-muted-foreground font-medium">Category</th>
                    <th className="text-right px-3 py-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort('amount')}>
                      <span className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-center px-3 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="w-20 px-3 py-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((txn) => (
                    <tr key={txn.id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(txn.id)}
                          onChange={() => toggleSelect(txn.id)}
                          className="rounded border-white/[0.08] bg-white/[0.02]"
                        />
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(txn.date)}</td>
                      <td className="px-3 py-3 font-medium">{txn.merchant || '-'}</td>
                      <td className="px-3 py-3 text-muted-foreground max-w-[200px] truncate">{txn.description}</td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs"
                          style={{ backgroundColor: `${categories.find((c) => c.id === txn.categoryId)?.color}15` || '#ffffff10', color: categories.find((c) => c.id === txn.categoryId)?.color || '#999' }}
                        >
                          {categoryMap[txn.categoryId] || 'Other'}
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-right font-medium tabular-nums ${txn.type === 'income' ? 'text-emerald-400' : ''}`}>
                        {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount, currency)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={txn.status === 'cleared' ? 'default' : txn.status === 'pending' ? 'outline' : 'destructive'} className="text-[10px] px-1.5 py-0">
                          {txn.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(txn)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(txn.id)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-rose-400 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === page ? 'default' : 'ghost'} size="sm" onClick={() => setPage(p)}>
              {p}
            </Button>
          ))}
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showForm && (
        <TransactionForm
          mode={formMode}
          transaction={editingTxn}
          categories={categories}
          currency={currency}
          onClose={() => setShowForm(false)}
          onSave={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function TransactionForm({
  mode,
  transaction,
  categories,
  currency,
  onClose,
  onSave,
}: {
  mode: FormMode;
  transaction: Transaction | null;
  categories: { id: string; name: string; color: string }[];
  currency: SharedCurrency;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    type: transaction?.type || 'expense',
    amount: transaction?.amount.toString() || '',
    description: transaction?.description || '',
    merchant: transaction?.merchant || '',
    categoryId: transaction?.categoryId || '2',
    paymentMethod: transaction?.paymentMethod || 'credit_card',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    status: transaction?.status || 'cleared',
    isRecurring: transaction?.isRecurring || false,
    notes: transaction?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setSaving(false);
      return;
    }

    const payload = {
      type: form.type as 'income' | 'expense',
      amount,
      currency,
      description: form.description,
      merchant: form.merchant || undefined,
      categoryId: form.categoryId,
      paymentMethod: form.paymentMethod as PaymentMethod,
      date: form.date,
      status: form.status as TransactionStatus,
      isRecurring: form.isRecurring,
      notes: form.notes || undefined,
    };

    try {
      if (mode === 'edit' && transaction) {
        await api.put(`/transactions/${transaction.id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
    } catch {
      // silent
    }

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold">{mode === 'create' ? 'Add Transaction' : 'Edit Transaction'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.04]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-3">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  form.type === t
                    ? t === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-white/[0.02] text-muted-foreground border border-white/[0.06]'
                }`}
              >
                {t === 'income' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount *</label>
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
              <label className="text-xs text-muted-foreground block mb-1">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Description *</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Coffee, Groceries, etc."
              className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Merchant</label>
              <input
                type="text"
                value={form.merchant}
                onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                placeholder="Starbucks, Amazon, etc."
                className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Category *</label>
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TransactionStatus }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="cleared">Cleared</option>
                <option value="pending">Pending</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={form.isRecurring}
              onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
              className="rounded border-white/[0.08] bg-white/[0.02]"
            />
            <label htmlFor="isRecurring" className="text-sm text-muted-foreground">Recurring transaction</label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {mode === 'create' ? 'Add Transaction' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
