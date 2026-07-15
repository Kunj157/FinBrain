import { useState, useEffect } from 'react';
import {
  Plus, X, Check, Tags, Pencil, Trash2, Loader2,
  ShoppingCart, Car, Home, Utensils, Heart, Gamepad2,
  BookOpen, Gift, Plane, Briefcase, Zap, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import type { Category } from '@finbrain/shared';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'shopping-cart': ShoppingCart,
  car: Car,
  house: Home,
  utensils: Utensils,
  heart: Heart,
  gamepad: Gamepad2,
  book: BookOpen,
  gift: Gift,
  plane: Plane,
  briefcase: Briefcase,
  zap: Zap,
  'dollar-sign': DollarSign,
  tags: Tags,
  folder: Tags,
};

const ICON_OPTIONS = [
  { value: 'shopping-cart', label: 'Shopping Cart' },
  { value: 'car', label: 'Car' },
  { value: 'house', label: 'House' },
  { value: 'utensils', label: 'Utensils' },
  { value: 'heart', label: 'Heart' },
  { value: 'gamepad', label: 'Gamepad' },
  { value: 'book', label: 'Book' },
  { value: 'gift', label: 'Gift' },
  { value: 'plane', label: 'Plane' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'zap', label: 'Zap' },
  { value: 'dollar-sign', label: 'Dollar' },
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
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch {
      toast.error('Failed to load categories');
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
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setEditingCat(cat);
    setFormMode('edit');
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Category name is required');
      return;
    }

    setSaving(true);
    const payload = { name: form.name.trim(), icon: form.icon, color: form.color };
    try {
      if (formMode === 'edit' && editingCat) {
        const res = await api.put(`/categories/${editingCat.id}`, payload);
        setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? res.data.data : c)));
        toast.success('Category updated');
      } else {
        const res = await api.post('/categories', payload);
        setCategories((prev) => [...prev, res.data.data]);
        toast.success('Category created');
      }
      setShowForm(false);
    } catch {
      toast.error('Failed to save category');
      if (formMode === 'edit' && editingCat) {
        setCategories((prev) => {
          const exists = prev.some((c) => c.id === editingCat.id);
          return exists ? prev : [...prev, editingCat];
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success('Category deleted', {
      action: {
        label: 'Undo',
        onClick: async () => {
          try {
            await api.post('/categories', { name: cat.name, color: cat.color, icon: cat.icon });
            fetchCategories();
            toast.success('Category restored');
          } catch {
            toast.error('Failed to restore');
          }
        },
      },
      duration: 5000,
    });
    try {
      await api.delete(`/categories/${id}`);
    } catch {
      setCategories((prev) => [...prev, cat]);
      toast.error('Failed to delete category');
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

      {categories.length === 0 ? (
        <div className="py-16 text-center">
          <Tags className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">No categories yet</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add your first category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || Tags;
            return (
            <Card key={cat.id} className="group relative overflow-hidden border-l-[3px]" style={{ borderLeftColor: cat.color }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <IconComponent className="h-5 w-5" style={{ color: cat.color }} />
                    </div>
                    <CardTitle className="text-sm font-medium">{cat.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{cat.isCustom ? 'Custom' : 'Default'}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-white/[0.04] hover:text-foreground transition-colors" aria-label={`Edit ${cat.name}`}>
                      <Pencil className="h-3 w-3" />
                    </button>
                    {cat.isCustom && (
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-white/[0.04] hover:text-rose-400 transition-colors" aria-label={`Delete ${cat.name}`}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} role="dialog" aria-modal="true" aria-labelledby="category-form-title">
          <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 id="category-form-title" className="text-lg font-semibold">{formMode === 'create' ? 'Add Category' : 'Edit Category'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/[0.04]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name *</label>
                <Input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Groceries"
                />
                {formError && <p className="text-xs text-rose-400 mt-1">{formError}</p>}
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className={`h-8 w-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${form.color === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/30'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    >
                      {form.color === color && <Check className="h-4 w-4 mx-auto text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Icon</label>
                <Select
                  value={form.icon}
                  onValueChange={(value) => setForm((f) => ({ ...f, icon: value }))}
                  options={ICON_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="button" className="flex-1 gap-2" onClick={handleSave} disabled={!form.name.trim() || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
