import { useState, useEffect } from 'react';
import { Plus, X, Check, Loader2, GripVertical, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
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
        <div className="text-center py-12 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-muted-foreground text-sm">No rules yet. Create one to auto-categorize transactions.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                rule.isActive
                  ? 'bg-white/[0.02] border-white/[0.08]'
                  : 'bg-white/[0.01] border-white/[0.04] opacity-50'
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  {rule.merchantPattern && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                      merchant: {rule.merchantPattern}
                    </span>
                  )}
                  {rule.descriptionPattern && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-mono">
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
              <button onClick={() => handleToggle(rule)} className="p-1.5 rounded-lg hover:bg-white/[0.04]">
                {rule.isActive
                  ? <ToggleRight className="h-5 w-5 text-emerald-400" />
                  : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                }
              </button>
              <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-white/[0.04] hover:text-rose-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold">Add Rule</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/[0.04]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Merchant Pattern</label>
                <input
                  type="text"
                  value={form.merchantPattern}
                  onChange={(e) => setForm((f) => ({ ...f, merchantPattern: e.target.value }))}
                  placeholder="e.g. amazon, netflix, shell"
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description Pattern</label>
                <input
                  type="text"
                  value={form.descriptionPattern}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionPattern: e.target.value }))}
                  placeholder="e.g. monthly subscription"
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Category *</label>
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
          </div>
        </div>
      )}
    </div>
  );
}
