import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, X, Check, Tags, Pencil, Trash2, ChevronDown, ChevronRight,
  ShoppingCart, Car, Home, Utensils, Heart, Gamepad2,
  BookOpen, Gift, Plane, Briefcase, Zap, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { InView } from '@/components/motion/in-view';
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

  // Expand every group the first time they load, and only then. Keying this
  // off expandedGroups.size instead would re-expand everything as soon as the
  // user collapsed the last group.
  const hasAutoExpanded = useRef(false);

  useEffect(() => {
    if (hasAutoExpanded.current || groups.length === 0) return;
    hasAutoExpanded.current = true;
    setExpandedGroups(new Set(groups.map((g) => g.id)));
  }, [groups]);

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading categories">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} lines={2} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Tags}
        title="Categories"
        description={`${categories.length} categories in ${groups.length} groups`}
        actions={<>
          <Button onClick={() => openCreate(false)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Subcategory
          </Button>
          <Button onClick={() => openCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Group
          </Button>
        </>}
      />

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {groups.map((group, index) => {
          const children = childMap[group.id] || [];
          const IconComponent = ICON_MAP[group.icon] || Tags;
          const isExpanded = expandedGroups.has(group.id);
          return (
            <InView key={group.id} index={index}>
            <Card className="overflow-hidden p-0">
              {/* The group's own colour as a lit top edge. */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${group.color}, transparent 80%)` }} />
              <CardHeader
                className="cursor-pointer select-none p-5 pb-3"
                onClick={() => toggleGroup(group.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(group.id); } }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-border"
                      style={{ backgroundColor: `${group.color}1f` }}
                    >
                      <IconComponent className="h-5 w-5" style={{ color: group.color }} />
                    </div>
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{children.length} categories</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(group); }}
                      aria-label={`Edit ${group.name}`}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {group.isCustom && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                        aria-label={`Delete ${group.name}`}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="space-y-0.5 border-t px-3 pb-3 pt-2">
                  {children.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">No subcategories yet</p>
                  ) : (
                    children.map((child) => {
                      const ChildIcon = ICON_MAP[child.icon] || Tags;
                      return (
                        <div
                          key={child.id}
                          className="group/item flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-foreground/[0.03]"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-md"
                              style={{ backgroundColor: `${child.color}15` }}
                            >
                              <ChildIcon className="h-3.5 w-3.5" style={{ color: child.color }} />
                            </div>
                            <span className="text-sm">{child.name}</span>
                            <Badge variant={child.isCustom ? 'accent' : 'secondary'} className="px-1.5 py-0 text-[10px]">{child.isCustom ? 'Custom' : 'Default'}</Badge>
                          </div>
                          <div className="flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/item:opacity-100">
                            <button onClick={() => openEdit(child)} aria-label={`Edit ${child.name}`} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
                              <Pencil className="h-3 w-3" />
                            </button>
                            {child.isCustom && (
                              <button onClick={() => handleDelete(child.id)} aria-label={`Delete ${child.name}`} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative">
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
                    className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-transparent p-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="h-3 w-3" aria-hidden />Add subcategory
                  </button>
                </CardContent>
              )}
            </Card>
            </InView>
          );
        })}

        {standalone.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Tags;
          return (
            <Card key={cat.id} className="overflow-hidden opacity-70">
              <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${cat.color}, transparent 80%)` }} />
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
                    <button onClick={() => openEdit(cat)} aria-label={`Edit ${cat.name}`} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                    </button>
                    {cat.isCustom && (
                      <button onClick={() => handleDelete(cat.id)} aria-label={`Delete ${cat.name}`} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md" onClick={() => setShowForm(false)}>
          <div className="mx-4 w-full max-w-md animate-in fade-in-0 zoom-in-95 rounded-2xl border bg-popover shadow-float duration-200 [background-image:var(--sheen)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-foreground/[0.06]">
              <h2 className="text-lg font-semibold">
                {formMode === 'create'
                  ? (formType === 'group' ? 'Add Group' : 'Add Subcategory')
                  : 'Edit Category'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-foreground/[0.04]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {formMode === 'create' && (
                <div className="flex gap-2 p-1 rounded-lg bg-foreground/[0.04]">
                  <button
                    onClick={() => setFormType('group')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm transition-colors ${formType === 'group' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                  >
                    Group
                  </button>
                  <button
                    onClick={() => setFormType('subcategory')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm transition-colors ${formType === 'subcategory' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
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
                  className="w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
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
                      className={`h-8 w-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${form.color === color ? 'border-foreground scale-110 shadow-lg' : 'border-transparent hover:border-foreground/30'}`}
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
