import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Target, Pencil, Trash2, X, Loader2, TrendingUp, Calendar,
  Check, AlertTriangle, Home, Car, GraduationCap, Plane, PiggyBank,
  Briefcase, Heart, CircleDollarSign, Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency } from '@finbrain/shared';

interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currency: string;
  currentAmount: number;
  deadline: string | null;
  goalType: string;
  icon: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  contributions: GoalContribution[];
  progress: number;
  remaining: number;
  onTrack: boolean;
  daysLeft: number | null;
}

type FormMode = 'create' | 'edit' | 'contribute';

const GOAL_TYPES = [
  { value: 'custom', label: 'Custom Goal' },
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'house', label: 'House' },
  { value: 'car', label: 'Car' },
  { value: 'education', label: 'Education' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'other', label: 'Other' },
] as const;

const ICON_OPTIONS = [
  { value: 'target', label: 'Target', Icon: Target },
  { value: 'home', label: 'Home', Icon: Home },
  { value: 'car', label: 'Car', Icon: Car },
  { value: 'graduation', label: 'Education', Icon: GraduationCap },
  { value: 'plane', label: 'Travel', Icon: Plane },
  { value: 'piggy', label: 'Savings', Icon: PiggyBank },
  { value: 'briefcase', label: 'Career', Icon: Briefcase },
  { value: 'heart', label: 'Health', Icon: Heart },
  { value: 'dollar', label: 'Finance', Icon: CircleDollarSign },
  { value: 'coins', label: 'Wealth', Icon: Coins },
] as const;

function getGoalIcon(iconName: string) {
  const found = ICON_OPTIONS.find((o) => o.value === iconName);
  return found ? found.Icon : Target;
}

function getProgressColor(progress: number, onTrack: boolean): string {
  if (progress >= 100) return 'bg-emerald-500';
  if (!onTrack) return 'bg-amber-500';
  if (progress >= 60) return 'bg-emerald-500';
  if (progress >= 30) return 'bg-emerald-400';
  return 'bg-emerald-300';
}

export default function Goals() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    goalType: 'custom',
    icon: 'target',
  });
  const [contributionData, setContributionData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/goals');
      setGoals(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalSaved = useMemo(() => goals.reduce((s, g) => s + g.currentAmount, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((s, g) => s + g.targetAmount, 0), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.progress >= 100).length, [goals]);
  const onTrackGoals = useMemo(() => goals.filter((g) => g.progress < 100 && g.onTrack).length, [goals]);

  const openCreate = () => {
    setEditingGoal(null);
    setFormMode('create');
    setFormData({ name: '', targetAmount: '', deadline: '', goalType: 'custom', icon: 'target' });
    setShowForm(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormMode('edit');
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline ? goal.deadline.split('T')[0] : '',
      goalType: goal.goalType,
      icon: goal.icon,
    });
    setShowForm(true);
  };

  const openContribute = (goal: Goal) => {
    setContributeGoal(goal);
    setFormMode('contribute');
    setContributionData({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.targetAmount) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currency,
        deadline: formData.deadline || undefined,
        goalType: formData.goalType,
        icon: formData.icon,
      };

      if (formMode === 'edit' && editingGoal) {
        const res = await api.put(`/goals/${editingGoal.id}`, payload);
        setGoals((prev) => prev.map((g) => (g.id === editingGoal.id ? res.data.data : g)));
      } else {
        const res = await api.post('/goals', payload);
        setGoals((prev) => [res.data.data, ...prev]);
      }
      setShowForm(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleContribute = async () => {
    if (!contributeGoal || !contributionData.amount) return;
    setSaving(true);
    try {
      const res = await api.post(`/goals/${contributeGoal.id}/contributions`, {
        amount: parseFloat(contributionData.amount),
        date: contributionData.date,
        notes: contributionData.notes || undefined,
      });
      setGoals((prev) => prev.map((g) => (g.id === contributeGoal.id ? res.data.data.goal : g)));
      setShowForm(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    setDeleting(goalId);
    try {
      await api.delete(`/goals/${goalId}`);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteContribution = async (goalId: string, contributionId: string) => {
    try {
      const res = await api.delete(`/goals/${goalId}/contributions/${contributionId}`);
      setGoals((prev) => prev.map((g) => (g.id === goalId ? res.data.data.goal : g)));
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">Track your savings goals and milestones</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Coins className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Saved</p>
                <p className="text-lg font-bold">{formatCurrency(totalSaved, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Target</p>
                <p className="text-lg font-bold">{formatCurrency(totalTarget, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold">{completedGoals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">On Track</p>
                <p className="text-lg font-bold">{onTrackGoals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Target className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">No goals yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first savings goal to get started</p>
            <Button onClick={openCreate} size="sm" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const GoalIcon = getGoalIcon(goal.icon);
            const isExpanded = expandedGoal === goal.id;

            return (
              <Card key={goal.id} className="stat-card card-hover">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                        <GoalIcon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{goal.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{goal.goalType.replace(/([A-Z])/g, ' $1')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(goal)} className="h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)} disabled={deleting === goal.id} className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                        {deleting === goal.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-2xl font-bold">{formatCurrency(goal.currentAmount, currency as SharedCurrency)}</span>
                      <span className="text-sm text-muted-foreground">of {formatCurrency(goal.targetAmount, currency as SharedCurrency)}</span>
                    </div>
                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getProgressColor(goal.progress, goal.onTrack)}`}
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">{goal.progress.toFixed(1)}%</span>
                      {goal.deadline && (
                        <span className={`text-xs ${goal.onTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {goal.daysLeft !== null ? (
                            goal.daysLeft > 0 ? `${goal.daysLeft} days left` : 'Deadline passed'
                          ) : 'No deadline'}
                        </span>
                      )}
                    </div>
                  </div>

                  {!goal.onTrack && goal.progress < 100 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-3">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-xs text-amber-400">Behind schedule</span>
                    </div>
                  )}

                  {goal.progress >= 100 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mb-3">
                      <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-xs text-emerald-400">Goal achieved!</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openContribute(goal)} className="flex-1 h-8 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Funds
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedGoal(isExpanded ? null : goal.id)} className="h-8 text-xs">
                      {isExpanded ? 'Hide' : 'History'}
                    </Button>
                  </div>

                  {isExpanded && goal.contributions.length > 0 && (
                    <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                      {goal.contributions.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] group">
                          <div>
                            <p className="text-xs font-medium">+{formatCurrency(c.amount, currency as SharedCurrency)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(c.date).toLocaleDateString()}
                              {c.notes ? ` — ${c.notes}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteContribution(goal.id, c.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && goal.contributions.length === 0 && (
                    <div className="mt-3 text-center py-4">
                      <p className="text-xs text-muted-foreground">No contributions yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">
                {formMode === 'contribute' ? `Add Funds to ${contributeGoal?.name}` : formMode === 'edit' ? 'Edit Goal' : 'New Goal'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {formMode === 'contribute' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount *</label>
                    <input
                      type="number"
                      value={contributionData.amount}
                      onChange={(e) => setContributionData({ ...contributionData, amount: e.target.value })}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                    <input
                      type="date"
                      value={contributionData.date}
                      onChange={(e) => setContributionData({ ...contributionData, date: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
                    <input
                      type="text"
                      value={contributionData.notes}
                      onChange={(e) => setContributionData({ ...contributionData, notes: e.target.value })}
                      placeholder="Optional note"
                      className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleContribute} disabled={!contributionData.amount || saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Add Funds
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Goal Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Emergency Fund"
                      className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Amount *</label>
                    <input
                      type="number"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      placeholder="0.00"
                      min="1"
                      step="0.01"
                      className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Goal Type</label>
                    <select
                      value={formData.goalType}
                      onChange={(e) => setFormData({ ...formData, goalType: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {GOAL_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Icon</label>
                    <div className="flex flex-wrap gap-2">
                      {ICON_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFormData({ ...formData, icon: opt.value })}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                            formData.icon === opt.value
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
                          }`}
                          title={opt.label}
                        >
                          <opt.Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={!formData.name || !formData.targetAmount || saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      {formMode === 'edit' ? 'Save Changes' : 'Create Goal'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
