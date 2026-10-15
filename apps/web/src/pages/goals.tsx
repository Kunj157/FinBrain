import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Target, Pencil, Trash2, X, Loader2, TrendingUp,
  Check, AlertTriangle, Home, Car, GraduationCap, Plane, PiggyBank,
  Briefcase, Heart, CircleDollarSign, Coins, Zap,
} from 'lucide-react';
import { ExplainViewButton } from '@/components/finance/explain-view-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { InView } from '@/components/motion/in-view';
import { TiltCard } from '@/components/motion/tilt-card';
import { Scene3D } from '@/components/three/scene';
import { GoalRingsPoster } from '@/components/three/goal-rings-poster';
import { goalRings, overallProgress } from '@/components/three/goal-rings-model';
import { areaFill, useChartTheme } from '@/lib/chart-theme';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency } from '@finbrain/shared';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

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
  { value: 'debt_payoff', label: 'Debt Payoff' },
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
  if (progress >= 100) return 'from-positive to-positive';
  if (!onTrack) return 'from-warning/70 to-warning';
  return 'from-primary/60 to-primary';
}

/** Token-styled form field shared by the goal and contribution forms. */
const fieldClass =
  'h-10 w-full rounded-lg border border-input bg-surface-sunken/60 px-3 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15';

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
  const [simAmount, setSimAmount] = useState<Record<string, string>>({});

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
  const rings = useMemo(() => goalRings(goals), [goals]);
  const overall = useMemo(() => overallProgress(goals), [goals]);
  const chart = useChartTheme();
  const money = useCallback((n: number) => formatCurrency(n, currency), [currency]);

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

  const handleAutoContribute = async (goalId: string) => {
    try {
      const res = await api.post(`/goals/${goalId}/auto-contribute`);
      setGoals((prev) => prev.map((g) => (g.id === goalId ? res.data.data.goal : g)));
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Goals"
        description="Track your savings goals and milestones"
        actions={
          <>
            <ExplainViewButton viewName="Goals" />
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </>
        }
      />

      {goals.length > 0 && (
        <InView>
          <Card className="overflow-hidden p-0">
            <div className="grid items-center md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="relative h-[300px] md:h-[340px]">
                <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_50%,hsl(var(--primary)/0.12),transparent_70%)]" />
                <Scene3D
                  load={() => import('@/components/three/goal-rings-scene')}
                  poster={<GoalRingsPoster rings={rings} />}
                  props={{ rings }}
                  className="h-full w-full"
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums">
                    <AnimatedNumber value={overall} from={0} format={(n) => `${n.toFixed(0)}%`} />
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">funded</span>
                </div>
              </div>
              <div className="space-y-5 p-6 md:pl-2">
                <div>
                  <p className="stat-label">Saved toward goals</p>
                  <p className="mt-1.5 text-4xl font-semibold tracking-tight tabular-nums">
                    <AnimatedNumber value={totalSaved} from={0} format={money} />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    of {formatCurrency(totalTarget, currency)} across {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
                  </p>
                </div>
                <ul className="space-y-2.5">
                  {rings.map((ring) => (
                    <li key={ring.id} className="flex items-center gap-3 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ring.color }} />
                      <span className="min-w-0 flex-1 truncate">{ring.name}</span>
                      <span className="tabular-nums text-muted-foreground">{Math.round(ring.progress * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </InView>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Saved', value: totalSaved, icon: Coins, tone: 'bg-primary/10 text-primary ring-primary/20', isMoney: true },
          { label: 'Total Target', value: totalTarget, icon: Target, tone: 'bg-info/10 text-info ring-info/20', isMoney: true },
          { label: 'Completed', value: completedGoals, icon: Check, tone: 'bg-positive/10 text-positive ring-positive/20', isMoney: false },
          { label: 'On Track', value: onTrackGoals, icon: TrendingUp, tone: 'bg-warning/10 text-warning ring-warning/20', isMoney: false },
        ].map((stat) => (
          <div key={stat.label} className="stat-card flex items-center gap-3 p-4">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', stat.tone)}>
              <stat.icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="truncate text-lg font-semibold tabular-nums">
                {stat.isMoney ? <AnimatedNumber value={stat.value} from={0} format={money} /> : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton className="h-56" />
          <CardSkeleton className="h-56" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first savings goal to get started"
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New Goal
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {goals.map((goal, index) => {
            const GoalIcon = getGoalIcon(goal.icon);
            const isExpanded = expandedGoal === goal.id;
            const ringColor = rings.find((ring) => ring.id === goal.id)?.color;

            return (
              <InView key={goal.id} index={index}>
              <TiltCard max={3} className="rounded-xl">
              <Card className="group">
                {ringColor && (
                  <span aria-hidden className="absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, ${ringColor}, transparent)` }} />
                )}
                <CardContent className="p-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
                        <GoalIcon className="h-5 w-5 text-primary" aria-hidden />
                      </div>
                      <div>
                        <h3 className="font-semibold">{goal.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{goal.goalType.replace(/([A-Z])/g, ' $1')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(goal)} className="h-7 w-7 p-0" aria-label={`Edit ${goal.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)} disabled={deleting === goal.id} className="h-7 w-7 p-0 text-negative hover:text-negative" aria-label={`Delete ${goal.name}`}>
                        {deleting === goal.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(goal.currentAmount, currency as SharedCurrency)}</span>
                      <span className="text-sm text-muted-foreground">of {formatCurrency(goal.targetAmount, currency as SharedCurrency)}</span>
                    </div>
                    <div
                      className="relative h-2 overflow-hidden rounded-full bg-foreground/[0.06]"
                      role="progressbar"
                      aria-label={`${goal.name} progress`}
                      aria-valuenow={Math.round(Math.min(goal.progress, 100))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out ${getProgressColor(goal.progress, goal.onTrack)}`}
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs tabular-nums text-muted-foreground">{goal.progress.toFixed(1)}%</span>
                      {goal.deadline && (
                        <span className={`text-xs ${goal.onTrack ? 'text-positive' : 'text-warning'}`}>
                          {goal.daysLeft !== null ? (
                            goal.daysLeft > 0 ? `${goal.daysLeft} days left` : 'Deadline passed'
                          ) : 'No deadline'}
                        </span>
                      )}
                    </div>
                  </div>

                  {!goal.onTrack && goal.progress < 100 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 border border-warning/10 mb-3">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                      <span className="text-xs text-warning">Behind schedule</span>
                    </div>
                  )}

                  {goal.progress >= 100 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-positive/5 border border-positive/15 mb-3">
                      <Check className="h-3.5 w-3.5 text-positive flex-shrink-0" />
                      <span className="text-xs text-positive">Goal achieved!</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openContribute(goal)} className="flex-1 h-8 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Funds
                    </Button>
                    {goal.progress < 100 && (
                      <Button variant="outline" size="sm" onClick={() => handleAutoContribute(goal.id)} className="h-8 text-xs gap-1">
                        <Zap className="h-3.5 w-3.5" />
                        Auto
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setExpandedGoal(isExpanded ? null : goal.id)} className="h-8 text-xs">
                      {isExpanded ? 'Hide' : 'History'}
                    </Button>
                  </div>

                  {isExpanded && goal.contributions.length > 0 && (
                    <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                      {goal.contributions.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-foreground/[0.02] group">
                          <div>
                            <p className="text-xs font-medium">+{formatCurrency(c.amount, currency as SharedCurrency)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(c.date).toLocaleDateString()}
                              {c.notes ? ` — ${c.notes}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteContribution(goal.id, c.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-negative hover:text-negative p-0.5"
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

                  {isExpanded && goal.contributions.length > 1 && (
                    <div className="mt-3 h-[120px]">
                      <Line
                        data={{
                          labels: [...goal.contributions].reverse().map((c) =>
                            new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          ),
                          datasets: [{
                            data: (() => {
                              let cumulative = 0;
                              return [...goal.contributions].reverse().map((c) => {
                                cumulative += c.amount;
                                return cumulative;
                              });
                            })(),
                            borderColor: chart.primary,
                            backgroundColor: areaFill('primary'),
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointBackgroundColor: chart.primary,
                            pointBorderColor: chart.surface,
                            pointHoverRadius: 5,
                            borderWidth: 2,
                          }],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false }, tooltip: chart.tooltip },
                          scales: {
                            x: { display: false },
                            y: { display: false },
                          },
                        }}
                      />
                    </div>
                  )}

                  {isExpanded && goal.progress < 100 && (
                    <div className="mt-3 p-3 rounded-lg bg-foreground/[0.02] border border-foreground/5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">What if I increase my contribution?</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={simAmount[goal.id] || ''}
                          onChange={(e) => setSimAmount({ ...simAmount, [goal.id]: e.target.value })}
                          placeholder="Monthly amount"
                          min="0"
                          aria-label="Monthly amount"
                          className="h-8 flex-1 rounded-md border border-input bg-surface-sunken/60 px-2 text-xs focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                        />
                      </div>
                      {simAmount[goal.id] && parseFloat(simAmount[goal.id]) > 0 && (
                        <div className="mt-2 space-y-1">
                          {(() => {
                            const remaining = goal.targetAmount - goal.currentAmount;
                            const monthly = parseFloat(simAmount[goal.id]);
                            const monthsToGoal = Math.ceil(remaining / monthly);
                            const currentPace = goal.daysLeft !== null && goal.daysLeft > 0 ? goal.daysLeft / 30 : remaining / Math.max((goal.currentAmount / Math.max(((Date.now() - new Date(goal.createdAt).getTime()) / 86400000) / 30), 1), 1);
                            const savedMonths = Math.max(0, Math.round(currentPace - monthsToGoal));
                            return (
                              <>
                                <p className="text-xs text-primary">At ${monthly}/month: goal reached in ~{monthsToGoal} months</p>
                                {savedMonths > 0 && <p className="text-xs text-muted-foreground">That's {savedMonths} months faster than your current pace</p>}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              </TiltCard>
              </InView>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in-0" onClick={() => setShowForm(false)}>
          <Card role="dialog" aria-modal="true" className="mx-4 w-full max-w-md rounded-2xl shadow-float animate-in fade-in-0 zoom-in-95" onClick={(e) => e.stopPropagation()}>
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
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                    <input
                      type="date"
                      value={contributionData.date}
                      onChange={(e) => setContributionData({ ...contributionData, date: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
                    <input
                      type="text"
                      value={contributionData.notes}
                      onChange={(e) => setContributionData({ ...contributionData, notes: e.target.value })}
                      placeholder="Optional note"
                      className={fieldClass}
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
                      className={fieldClass}
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
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Goal Type</label>
                    <select
                      value={formData.goalType}
                      onChange={(e) => setFormData({ ...formData, goalType: e.target.value })}
                      className={fieldClass}
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
                      className={fieldClass}
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
                              ? 'bg-primary/10 border-primary/30 text-primary'
                              : 'bg-foreground/5 border-foreground/10 text-muted-foreground hover:border-foreground/20'
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
