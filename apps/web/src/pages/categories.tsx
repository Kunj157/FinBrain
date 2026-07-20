import { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Check, Tags, Pencil, Trash2, Loader2, ChevronDown, ChevronRight,
  ShoppingCart, Car, Home, Utensils, Heart, Gamepad2,
  BookOpen, Gift, Plane, Briefcase, Zap, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  { value: 'shopping-cart', label: '🛒 Shopping Cart' },
  { value: 'car', label: '🚗 Car' },
  { value: 'house', label: '🏠 House' },
  { value: 'utensils', label: '🍽️ Utensils' },
  { value: 'heart', label: '❤️ Heart' },
  { value: 'gamepad', label: '🎮 Gamepad' },
  { value: 'book', label: '📚 Book' },
  { value: 'gift', label: '🎁 Gift' },
  { value: 'plane', label: '✈️ Plane' },
  { value: 'briefcase', label: '💼 Briefcase' },
  { value: 'zap', label: '⚡ Zap' },
  { value: 'dollar-sign', label: '💰 Dollar' },
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [formType, setFormType] = useState<'group' | 'subcategory'>('group');

  const [form, setForm] = useState({
    name: '',
    icon: 'tags',
    color: '#10b981',
    parentId: '',
  });

  const { groups, standalone } = useMemo(() => {
    const gs: Category[] = [];
    const ss: Category[] = [];
    const childMap: Record<string, Category[]> = {};
    for (const c of categories) {
      if (c.parentId) {
        if (!childMap[c.parentId]) childMap[c.parentId] = [];
        childMap[c.parentId].push(c);
      } else {
        gs.push(c);
      }
    }
    for (const c of categories) {
      if (c.parentId) {
        const parentExists = categories.some((p) => p.id === c.parentId);
        if (!parentExists) ss.push(c);
      }
    }
    return { groups: gs, standalone: ss, childMap };
  }, [categories]);

  const childMap = useMemo(() => {
    const map: Record<string, Category[]> = {};
    for (const c of categories) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    return map;
  }, [categories]);

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

  const openCreate = (asGroup: boolean) => {
    setForm({ name: '', icon: 'tags', color: '#10b981', parentId: '' });
    setEditingCat(null);
    setFormMode('create');
    setFormType(asGroup ? 'group' : 'subcategory');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, parentId: cat.parentId || '' });
    setEditingCat(cat);
    setFormMode('edit');
    setFormType(cat.parentId ? 'subcategory' : 'group');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
    };
    if (formType === 'subcategory' && form.parentId) {
      payload.parentId = form.parentId;
    }
    try {
      if (formMode === 'edit' && editingCat) {
        await api.put(`/categories/${editingCat.id}`, payload);
      } else {
        await api.post('/categories', payload);
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

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groups.map((g) => g.id)));
    }
  }, [groups]);

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

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
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categories in {groups.length} groups</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openCreate(false)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Subcategory
          </Button>
          <Button onClick={() => openCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Group
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => {
          const children = childMap[group.id] || [];
          const IconComponent = ICON_MAP[group.icon] || Tags;
          const isExpanded = expandedGroups.has(group.id);
          return (
            <Card key={group.id} className="border-l-[3px]" style={{ borderLeftColor: group.color }}>
              <CardHeader
                className="pb-2 cursor-pointer select-none"
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${group.color}15` }}
                    >
                      <IconComponent className="h-5 w-5" style={{ color: group.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{children.length} categories</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(group); }}
                      className="p-1.5 rounded-lg hover:bg-white/[0.04] hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {group.isCustom && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.04] hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0 space-y-1">
                  {children.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">No subcategories yet</p>
                  ) : (
                    children.map((child) => {
                      const ChildIcon = ICON_MAP[child.icon] || Tags;
                      return (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.02] group/item"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-md"
                              style={{ backgroundColor: `${child.color}15` }}
                            >
                              <ChildIcon className="h-3.5 w-3.5" style={{ color: child.color }} />
                            </div>
                            <span className="text-sm">{child.name}</span>
                            <span className="text-[10px] text-muted-foreground">{child.isCustom ? 'Custom' : 'Default'}</span>
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(child)} className="p-1 rounded-lg hover:bg-white/[0.04] hover:text-foreground transition-colors">
                              <Pencil className="h-3 w-3" />
                            </button>
                            {child.isCustom && (
                              <button onClick={() => handleDelete(child.id)} className="p-1 rounded-lg hover:bg-white/[0.04] hover:text-rose-400 transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <button
                    onClick={() => { openCreate(false); setForm((f) => ({ ...f, parentId: group.id })); }}
                    className="w-full text-left p-2 rounded-lg text-xs text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors"
                  >
                    + Add subcategory
                  </button>
                </CardContent>
              )}
            </Card>
          );
        })}

        {standalone.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Tags;
          return (
            <Card key={cat.id} className="border-l-[3px] opacity-60" style={{ borderLeftColor: cat.color }}>
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
                  <div className="flex items-center gap-1">
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
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">Uncategorized — {cat.isCustom ? 'Custom' : 'Default'}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold">
                {formMode === 'create'
                  ? (formType === 'group' ? 'Add Group' : 'Add Subcategory')
                  : 'Edit Category'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/[0.04]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {formMode === 'create' && (
                <div className="flex gap-2 p-1 rounded-lg bg-white/[0.04]">
                  <button
                    onClick={() => setFormType('group')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm transition-colors ${formType === 'group' ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground'}`}
                  >
                    Group
                  </button>
                  <button
                    onClick={() => setFormType('subcategory')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm transition-colors ${formType === 'subcategory' ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground'}`}
                  >
                    Subcategory
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={formType === 'group' ? 'e.g. Housing' : 'e.g. Rent'}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {formType === 'subcategory' && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Parent Group *</label>
                  <Select
                    value={form.parentId}
                    onValueChange={(value) => setForm((f) => ({ ...f, parentId: value }))}
                    options={groupOptions}
                    placeholder="Select a group"
                  />
                </div>
              )}

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
                  options={ICON_OPTIONS.map((opt) => ({ value: opt.value, label: `${opt.label} ${opt.value}` }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="button" className="flex-1 gap-2" onClick={handleSave} disabled={!form.name.trim() || (formType === 'subcategory' && !form.parentId)}>
                  <Check className="h-4 w-4" />
                  {formMode === 'create' ? 'Add' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
