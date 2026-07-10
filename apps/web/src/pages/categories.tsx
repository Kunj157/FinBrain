import { useState, useEffect } from 'react';
import { Plus, X, Check, Tags, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import type { Category } from '@finbrain/shared';

const ICON_OPTIONS = [
  { value: 'shopping-cart', label: '🛒' },
  { value: 'car', label: '🚗' },
  { value: 'house', label: '🏠' },
  { value: 'utensils', label: '🍽️' },
  { value: 'heart', label: '❤️' },
  { value: 'gamepad', label: '🎮' },
  { value: 'book', label: '📚' },
  { value: 'gift', label: '🎁' },
  { value: 'plane', label: '✈️' },
  { value: 'briefcase', label: '💼' },
  { value: 'zap', label: '⚡' },
  { value: 'dollar-sign', label: '💰' },
];

const PRESET_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f43f5e',
  '#f59e0b', '#ec4899', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
];

type FormMode = 'create' | 'edit';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name: '',
    icon: 'tags',
    color: '#10b981',
  });

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setForm({ name: '', icon: 'tags', color: '#10b981' });
    setEditingCat(null);
    setFormMode('create');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setEditingCat(cat);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    try {
      if (formMode === 'edit' && editingCat) {
        await api.put(`/categories/${editingCat.id}`, {
          name: form.name.trim(),
          icon: form.icon,
          color: form.color,
        });
      } else {
        await api.post('/categories', {
          name: form.name.trim(),
          icon: form.icon,
          color: form.color,
        });
      }
      await fetchCategories();
    } catch {
      // silent
    }

    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      await fetchCategories();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="group relative overflow-hidden border-l-[3px]" style={{ borderLeftColor: cat.color }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <Tags className="h-5 w-5" style={{ color: cat.color }} />
                  </div>
                  <CardTitle className="text-sm font-medium">{cat.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{cat.isCustom ? 'Custom' : 'Default'}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-white/[0.04] hover:text-foreground transition-colors">
                    <Pencil className="h-3 w-3" />
                  </button>
                  {cat.isCustom && (
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-white/[0.04] hover:text-rose-400 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold">{formMode === 'create' ? 'Add Category' : 'Edit Category'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/[0.04]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Groceries"
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className={`h-8 w-8 rounded-lg border-2 transition-all ${form.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    >
                      {form.color === color && <Check className="h-4 w-4 mx-auto text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Icon</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label} {opt.value}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="button" className="flex-1 gap-2" onClick={handleSave} disabled={!form.name.trim()}>
                  <Check className="h-4 w-4" />
                  {formMode === 'create' ? 'Add Category' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}