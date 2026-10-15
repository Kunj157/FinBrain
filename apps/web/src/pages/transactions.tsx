import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, ArrowUpDown, Pencil, Trash2, ArrowRightLeft, X, Check, Loader2, ChevronLeft, ChevronRight, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
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
  householdMemberId: string;
}

interface HouseholdMember {
  userId: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

type FormMode = 'create' | 'edit';

export default function TransactionsPage() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [filters, setFilters] = useState<Filters>({ type: '', categoryId: '', paymentMethod: '', search: '', sort: 'date', order: 'desc', householdMemberId: '' });
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [clearing, setClearing] = useState(false);
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
    if (filters.householdMemberId) params.set('householdMemberId', filters.householdMemberId);

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

  // Fetch household members for filtering
  useEffect(() => {
    api.get('/households').then((res) => {
      if (res.data.data?.members) {
        setHouseholdMembers(res.data.data.members);
      }
    }).catch(() => {});
  }, []);

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

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      await api.delete('/seed/transactions');
      setSelected(new Set());
      await fetchData();
    } finally {
      setClearing(false);
    }
  }, [fetchData]);

  const pageIncome = txns.filter((t) => t.type === 'income').length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArrowRightLeft}
        title="Transactions"
        description={
          <>
            <span className="tabular-nums">{total}</span> total transactions
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={clearing || txns.length === 0}>
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
              Clear All
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2.5 border-b bg-foreground/[0.015] p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="text"
              placeholder="Search transactions..."
              aria-label="Search transactions"
              value={filters.search}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select
            className="w-full sm:w-[150px]"
            value={filters.type}
            onValueChange={(value) => { setFilters((f) => ({ ...f, type: value })); setPage(1); }}
            options={[
              { value: '', label: 'All types' },
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
            ]}
          />
          <Select
            className="w-full sm:w-[180px]"
            value={filters.categoryId}
            onValueChange={(value) => { setFilters((f) => ({ ...f, categoryId: value })); setPage(1); }}
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            className="w-full sm:w-[160px]"
            value={filters.paymentMethod}
            onValueChange={(value) => { setFilters((f) => ({ ...f, paymentMethod: value })); setPage(1); }}
            options={[
              { value: '', label: 'All methods' },
              ...PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label })),
            ]}
          />
          {householdMembers.length > 0 && (
            <Select
              className="w-full sm:w-[170px]"
              value={filters.householdMemberId}
              onValueChange={(value) => { setFilters((f) => ({ ...f, householdMemberId: value })); setPage(1); }}
              options={[
                { value: '', label: 'My transactions' },
                { value: 'all', label: 'All household' },
                ...householdMembers.map((m) => ({ value: m.userId, label: m.user.name || m.user.email })),
              ]}
            />
          )}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-3 border-b bg-primary/[0.06] px-4 py-2.5 text-sm">
            <span className="font-medium"><span className="tabular-nums">{selected.size}</span> selected</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear selection</Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete {selected.size}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading transactions">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : txns.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="No transactions found"
            description="Try a different filter, import a statement, or add one by hand."
            action={
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add your first transaction
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl">
              <tr>
                <TableHead className="w-10 pl-4">
                  <input
                    type="checkbox"
                    aria-label="Select all transactions on this page"
                    checked={selected.size === txns.length && txns.length > 0}
                    onChange={() => {
                      if (selected.size === txns.length) setSelected(new Set());
                      else setSelected(new Set(txns.map((t) => t.id)));
                    }}
                    className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                  />
                </TableHead>
                <SortHead label="Date" field="date" filters={filters} onSort={toggleSort} />
                <SortHead label="Merchant" field="merchant" filters={filters} onSort={toggleSort} />
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <SortHead label="Amount" field="amount" filters={filters} onSort={toggleSort} align="right" />
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-20 pr-4 text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {txns.map((txn) => {
                const cat = categories.find((c) => c.id === txn.categoryId);
                const isIncome = txn.type === 'income';
                return (
                  <TableRow key={txn.id} data-state={selected.has(txn.id) ? 'selected' : undefined} className="group">
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${txn.merchant || txn.description}`}
                        checked={selected.has(txn.id)}
                        onChange={() => toggleSelect(txn.id)}
                        className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(txn.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-foreground/[0.03] text-[11px] font-semibold uppercase text-muted-foreground"
                        >
                          {(txn.merchant || txn.description || '?').charAt(0)}
                        </span>
                        <span className="font-medium">{txn.merchant || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground" title={txn.description}>{txn.description}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-full border bg-foreground/[0.02] px-2 py-0.5 text-xs">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat?.color || 'hsl(var(--muted-foreground))' }} />
                        {categoryMap[txn.categoryId] || 'Other'}
                      </span>
                    </TableCell>
                    <TableCell className={`whitespace-nowrap text-right font-semibold ${isIncome ? 'text-positive' : ''}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(txn.amount, txn.currency || currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={txn.status === 'cleared' ? 'positive' : txn.status === 'pending' ? 'warning' : 'destructive'}
                        className="px-1.5 py-0 text-[10px] capitalize"
                      >
                        {txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button onClick={() => openEdit(txn)} aria-label="Edit transaction" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(txn.id)} aria-label="Delete transaction" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {!loading && txns.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
            <span>
              Showing <span className="tabular-nums text-foreground">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> of{' '}
              <span className="tabular-nums text-foreground">{total}</span>
              {pageIncome > 0 && <> · <span className="tabular-nums">{pageIncome}</span> income on this page</>}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const pages: (number | '...')[] = [];
                  const maxVisible = 5;
                  if (totalPages <= maxVisible) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (page > 3) pages.push('...');
                    const start = Math.max(2, page - 1);
                    const end = Math.min(totalPages - 1, page + 1);
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (page < totalPages - 2) pages.push('...');
                    pages.push(totalPages);
                  }
                  return pages.map((p, idx) =>
                    p === '...' ? (
                      <span key={`e-${idx}`} className="px-1">…</span>
                    ) : (
                      <Button key={p} variant={p === page ? 'outline' : 'ghost'} size="sm" className="h-8 min-w-8 px-2 tabular-nums" aria-current={p === page ? 'page' : undefined} onClick={() => setPage(p)}>
                        {p}
                      </Button>
                    )
                  );
                })()}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

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

function SortHead({
  label,
  field,
  filters,
  onSort,
  align = 'left',
}: {
  label: string;
  field: string;
  filters: Filters;
  onSort: (field: string) => void;
  align?: 'left' | 'right';
}) {
  const active = filters.sort === field;
  return (
    <TableHead
      className={align === 'right' ? 'text-right' : undefined}
      aria-sort={active ? (filters.order === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] transition-colors hover:text-foreground ${active ? 'text-foreground' : ''}`}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-50'}`} aria-hidden />
      </button>
    </TableHead>
  );
}

const fieldClass =
  'w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15';

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
    categoryId: transaction?.categoryId || '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md animate-in fade-in-0" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="txn-form-title" className="w-full max-w-lg rounded-2xl border bg-popover shadow-float [background-image:var(--sheen)] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-5">
          <h2 id="txn-form-title" className="text-lg font-semibold tracking-tight">{mode === 'create' ? 'Add Transaction' : 'Edit Transaction'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-1 rounded-xl border bg-surface-sunken/60 p-1">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                aria-pressed={form.type === t}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  form.type === t
                    ? t === 'income' ? 'bg-card text-positive shadow-raised ring-1 ring-positive/25' : 'bg-card text-negative shadow-raised ring-1 ring-negative/25'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'income' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount *</label>
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
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description *</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Coffee, Groceries, etc."
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Merchant</label>
              <input
                type="text"
                value={form.merchant}
                onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                placeholder="Starbucks, Amazon, etc."
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category *</label>
              <Select
                value={form.categoryId}
                onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value }))}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Payment Method</label>
              <Select
                value={form.paymentMethod}
                onValueChange={(value) => setForm((f) => ({ ...f, paymentMethod: value as PaymentMethod }))}
                options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((f) => ({ ...f, status: value as TransactionStatus }))}
                options={[
                  { value: 'cleared', label: 'Cleared' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'flagged', label: 'Flagged' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
              className={`${fieldClass} h-auto resize-none py-2`}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={form.isRecurring}
              onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
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
