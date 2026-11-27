import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EMPTY_RULE_FORM, criteriaFromForm, ruleFormProblem, type RuleFormValues } from './rule-form';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Account, Category, RulePreview } from '@finbrain/shared';

// Radix Select cannot use an empty string as an item value, so "any account" is a sentinel.
const ANY_ACCOUNT = '__any_account__';

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
  return message ?? fallback;
}

interface RuleDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  /** Prefill for a new rule, for example from a transaction. Read when the dialog opens. */
  initial?: Partial<RuleFormValues>;
}

export function RuleDialog({ open, onClose, onSaved, categories, initial }: RuleDialogProps) {
  const [form, setForm] = useState<RuleFormValues>(EMPTY_RULE_FORM);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_RULE_FORM, ...initialRef.current });
    setPreview(null);
    setError(null);
    api.get('/accounts')
      .then((res) => setAccounts(res.data.data))
      .catch(() => setAccounts([]));
  }, [open]);

  const update = (patch: Partial<RuleFormValues>) => {
    setForm((f) => ({ ...f, ...patch }));
    setPreview(null);
  };

  const handlePreview = async () => {
    const criteria = criteriaFromForm(form);
    if (!criteria) return setError('Amounts must be numbers, zero or more');
    setPreviewing(true);
    setError(null);
    try {
      const res = await api.post('/rules/preview', criteria);
      setPreview(res.data.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not test this rule'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    const problem = ruleFormProblem(form);
    const criteria = criteriaFromForm(form);
    if (problem || !criteria) return setError(problem);
    setSaving(true);
    setError(null);
    try {
      // No priority is sent: the server puts a new rule at the top.
      await api.post('/rules', { ...criteria, categoryId: form.categoryId });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the rule'));
    } finally {
      setSaving(false);
    }
  };

  const problem = ruleFormProblem(form);

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogClose onClose={onClose} />
      <DialogHeader className="p-5 pb-0">
        <DialogTitle>Add Rule</DialogTitle>
        <DialogDescription>Matching transactions get this category. Rules are checked in order, top first.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rule-merchant" className="mb-1.5 block text-xs font-medium text-muted-foreground">Merchant contains</label>
            <Input
              id="rule-merchant"
              type="text"
              value={form.merchantPattern}
              onChange={(e) => update({ merchantPattern: e.target.value })}
              placeholder="e.g. amazon, netflix"
            />
          </div>
          <div>
            <label htmlFor="rule-description" className="mb-1.5 block text-xs font-medium text-muted-foreground">Description contains</label>
            <Input
              id="rule-description"
              type="text"
              value={form.descriptionPattern}
              onChange={(e) => update({ descriptionPattern: e.target.value })}
              placeholder="e.g. monthly subscription"
            />
          </div>
          <div>
            <label htmlFor="rule-amount-min" className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount at least</label>
            <Input
              id="rule-amount-min"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.amountMin}
              onChange={(e) => update({ amountMin: e.target.value })}
              placeholder="No minimum"
            />
          </div>
          <div>
            <label htmlFor="rule-amount-max" className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount at most</label>
            <Input
              id="rule-amount-max"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.amountMax}
              onChange={(e) => update({ amountMax: e.target.value })}
              placeholder="No maximum"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Account</label>
          <Select
            value={form.accountId || ANY_ACCOUNT}
            onValueChange={(value) => update({ accountId: value === ANY_ACCOUNT ? '' : value })}
            ariaLabel="Account"
            options={[{ value: ANY_ACCOUNT, label: 'Any account' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category *</label>
          <Select
            value={form.categoryId}
            onValueChange={(value) => update({ categoryId: value })}
            ariaLabel="Category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <div className="rounded-xl border bg-surface-sunken/40 p-3.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground">
              {preview
                ? `${preview.matched} existing transaction${preview.matched === 1 ? '' : 's'} match${preview.matched === 1 ? 'es' : ''} (of ${preview.scanned})`
                : 'Test the rule against your existing transactions.'}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={handlePreview} disabled={previewing} className="gap-2">
              {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Test rule
            </Button>
          </div>
          {preview && preview.sample.length > 0 && (
            <ul className="mt-3 divide-y divide-border/60">
              {preview.sample.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground">{formatDate(row.date)}</span>{' '}
                    {row.merchant || row.description}
                  </span>
                  <span className="flex-shrink-0 tabular-nums">{row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p role="alert" className="text-sm text-negative">{error}</p>}
        {!error && problem && <p className="text-xs text-muted-foreground">{problem}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="button" className="flex-1 gap-2" onClick={handleSave} disabled={problem !== null || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Add Rule
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
