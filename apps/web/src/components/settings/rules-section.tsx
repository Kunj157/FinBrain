import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Wand2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RuleDialog } from './rule-dialog';
import api from '@/lib/api';
import type { ApplyRulesResult, CategorizationRule, Category } from '@finbrain/shared';

function errorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? fallback;
}

/** The conditions a rule sets, as short chips. Amounts are shown as plain numbers. */
function criteriaChips(rule: CategorizationRule): string[] {
  const chips: string[] = [];
  if (rule.merchantPattern) chips.push(`merchant: ${rule.merchantPattern}`);
  if (rule.descriptionPattern) chips.push(`desc: ${rule.descriptionPattern}`);
  if (rule.amountMin !== null && rule.amountMax !== null) chips.push(`${rule.amountMin} to ${rule.amountMax}`);
  else if (rule.amountMin !== null) chips.push(`at least ${rule.amountMin}`);
  else if (rule.amountMax !== null) chips.push(`at most ${rule.amountMax}`);
  if (rule.accountId) chips.push(`account: ${rule.account?.name ?? 'unknown'}`);
  return chips;
}

export function RulesSection() {
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [applyPreview, setApplyPreview] = useState<ApplyRulesResult | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const [rulesRes, catsRes] = await Promise.all([api.get('/rules'), api.get('/categories')]);
      setRules(rulesRes.data.data);
      setCategories(catsRes.data.data);
    } catch (err) {
      setNotice(errorMessage(err, 'Could not load rules'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // Moves a rule one place. The server answers with the full list in its new order.
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= rules.length) return;
    const ids = rules.map((rule) => rule.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      const res = await api.post('/rules/reorder', { ids });
      setRules(res.data.data);
    } catch (err) {
      setNotice(errorMessage(err, 'Could not change the order'));
    }
  };

  const handleToggle = async (rule: CategorizationRule) => {
    try {
      await api.put(`/rules/${rule.id}`, { isActive: !rule.isActive });
      await fetchRules();
    } catch (err) {
      setNotice(errorMessage(err, 'Could not update the rule'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/rules/${id}`);
      await fetchRules();
    } catch (err) {
      setNotice(errorMessage(err, 'Could not delete the rule'));
    }
  };

  const openApply = async () => {
    setNotice(null);
    try {
      const res = await api.post('/rules/apply', { dryRun: true });
      setApplyPreview(res.data.data);
    } catch (err) {
      setNotice(errorMessage(err, 'Could not check the rules'));
    }
  };

  const confirmApply = async () => {
    setApplying(true);
    try {
      const res = await api.post('/rules/apply', { dryRun: false });
      setApplyPreview(null);
      setNotice(`Updated ${res.data.data.changed} transaction${res.data.data.changed === 1 ? '' : 's'}.`);
    } catch (err) {
      setNotice(errorMessage(err, 'Could not apply the rules'));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading rules">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    );
  }

  const activeCount = rules.filter((r) => r.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {activeCount} active rule{activeCount === 1 ? '' : 's'}. Checked top first; the first match wins.
        </p>
        <div className="flex gap-2">
          <Button onClick={openApply} variant="outline" size="sm" className="gap-2" disabled={activeCount === 0}>
            <Play className="h-4 w-4" />
            Apply to transactions
          </Button>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}

      {rules.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title="No rules yet"
          description="Create one to auto-categorize transactions."
          className="rounded-xl border border-dashed py-10"
        />
      ) : (
        <ol className="space-y-2">
          {rules.map((rule, index) => (
            <li
              key={rule.id}
              className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                rule.isActive
                  ? 'bg-surface-sunken/40 hover:border-border-strong'
                  : 'border-border/60 bg-transparent opacity-55'
              }`}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move rule up"
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === rules.length - 1}
                  aria-label="Move rule down"
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  {criteriaChips(rule).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary"
                    >
                      {chip}
                    </span>
                  ))}
                  <span className="text-muted-foreground">→</span>
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: `${rule.category?.color || '#6b7280'}20`,
                      color: rule.category?.color || '#6b7280',
                    }}
                  >
                    {rule.category?.name || 'Unknown'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleToggle(rule)}
                aria-label={rule.isActive ? 'Pause rule' : 'Activate rule'}
                aria-pressed={rule.isActive}
                className="rounded-lg p-1.5 transition-colors hover:bg-foreground/[0.05]"
              >
                {rule.isActive
                  ? <ToggleRight className="h-5 w-5 text-primary" />
                  : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                }
              </button>
              <button
                onClick={() => handleDelete(rule.id)}
                aria-label="Delete rule"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <RuleDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={fetchRules}
        categories={categories}
      />

      <Dialog open={applyPreview !== null} onClose={() => setApplyPreview(null)} className="max-w-md">
        <DialogClose onClose={() => setApplyPreview(null)} />
        <DialogHeader className="p-5 pb-0">
          <DialogTitle>Apply rules to existing transactions</DialogTitle>
          <DialogDescription>
            {applyPreview?.changed
              ? `${applyPreview.changed} transaction${applyPreview.changed === 1 ? '' : 's'} will change category. Transactions marked reviewed are skipped.`
              : 'No transactions would change category.'}
          </DialogDescription>
        </DialogHeader>
        {applyPreview && applyPreview.byRule.length > 0 && (
          <ul className="mx-5 mt-4 divide-y divide-border/60 rounded-xl border text-sm">
            {applyPreview.byRule.map((row) => (
              <li key={row.ruleId} className="flex justify-between px-3.5 py-2">
                <span>{row.categoryName}</span>
                <span className="tabular-nums text-muted-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 p-5">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setApplyPreview(null)}>Cancel</Button>
          <Button
            type="button"
            className="flex-1"
            onClick={confirmApply}
            disabled={applying || !applyPreview?.changed}
          >
            Apply
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
