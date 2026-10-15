import { useState, useEffect } from 'react';
import { Plus, Check, GripVertical, ToggleLeft, ToggleRight, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import type { CategorizationRule, Category } from '@finbrain/shared';

export function RulesSection() {
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    merchantPattern: '',
    descriptionPattern: '',
    categoryId: '',
    priority: 0,
  });

  const fetchRules = async () => {
    try {
      const [rulesRes, catsRes] = await Promise.all([
        api.get('/rules'),
        api.get('/categories'),
      ]);
      setRules(rulesRes.data.data);
      setCategories(catsRes.data.data);
    } catch { /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleSave = async () => {
    if ((!form.merchantPattern && !form.descriptionPattern) || !form.categoryId) return;
    try {
      await api.post('/rules', {
        ...form,
        priority: rules.length,
      });
      await fetchRules();
      setShowForm(false);
      setForm({ merchantPattern: '', descriptionPattern: '', categoryId: '', priority: 0 });
    } catch { /* silent */ }
  };

  const handleToggle = async (rule: CategorizationRule) => {
    try {
      await api.put(`/rules/${rule.id}`, { isActive: !rule.isActive });
      await fetchRules();
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/rules/${id}`);
      await fetchRules();
    } catch { /* silent */ }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {rules.filter((r) => r.isActive).length} active rules
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title="No rules yet"
          description="Create one to auto-categorize transactions."
          className="rounded-xl border border-dashed py-10"
        />
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-4 rounded-xl border p-3.5 transition-colors ${
                rule.isActive
                  ? 'bg-surface-sunken/40 hover:border-border-strong'
                  : 'border-border/60 bg-transparent opacity-55'
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  {rule.merchantPattern && (
                    <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                      merchant: {rule.merchantPattern}
                    </span>
                  )}
                  {rule.descriptionPattern && (
                    <span className="rounded-md border border-info/20 bg-info/10 px-2 py-0.5 font-mono text-xs text-info">
                      desc: {rule.descriptionPattern}
                    </span>
                  )}
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
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onClose={() => setShowForm(false)} className="max-w-md">
        <DialogClose onClose={() => setShowForm(false)} />
        <DialogHeader className="p-5 pb-0">
          <DialogTitle>Add Rule</DialogTitle>
          <DialogDescription>Matching transactions get this category automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="rule-merchant" className="mb-1.5 block text-xs font-medium text-muted-foreground">Merchant Pattern</label>
            <Input
              id="rule-merchant"
              type="text"
              value={form.merchantPattern}
              onChange={(e) => setForm((f) => ({ ...f, merchantPattern: e.target.value }))}
              placeholder="e.g. amazon, netflix, shell"
            />
          </div>
          <div>
            <label htmlFor="rule-description" className="mb-1.5 block text-xs font-medium text-muted-foreground">Description Pattern</label>
            <Input
              id="rule-description"
              type="text"
              value={form.descriptionPattern}
              onChange={(e) => setForm((f) => ({ ...f, descriptionPattern: e.target.value }))}
              placeholder="e.g. monthly subscription"
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
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              type="button"
              className="flex-1 gap-2"
              onClick={handleSave}
              disabled={(!form.merchantPattern && !form.descriptionPattern) || !form.categoryId}
            >
              <Check className="h-4 w-4" />
              Add Rule
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
