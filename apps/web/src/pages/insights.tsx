import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles, Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  ShieldCheck, ShieldAlert, ShieldX, Send,
  DollarSign, PiggyBank, Target, Zap, RefreshCw, Info,
} from 'lucide-react';
import { m } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { InView } from '@/components/motion/in-view';
import { TiltCard } from '@/components/motion/tilt-card';
import { BorderTrail } from '@/components/motion/border-trail';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { fetchAllTransactions } from '@/lib/transactions';
import { LoadError } from '@/components/ui/load-error';
import { useAdvisorChat } from '@/hooks/use-advisor-chat';
import { ChatBubble } from '@/components/advisor/chat-bubble';
import { cn, formatCurrency } from '@/lib/utils';
import type { Transaction, Category, Budget, Goal, Currency as SharedCurrency } from '@finbrain/shared';

type Insight = {
  id: string;
  type: 'alert' | 'insight' | 'suggestion';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  icon: typeof TrendingUp;
  color: string;
};

const HEALTH_LABELS: Record<number, { label: string; color: string; icon: typeof ShieldCheck }> = {
  0: { label: 'Critical', color: 'text-negative', icon: ShieldX },
  40: { label: 'Needs Work', color: 'text-warning', icon: ShieldAlert },
  70: { label: 'Good', color: 'text-positive', icon: ShieldCheck },
  90: { label: 'Excellent', color: 'text-positive', icon: ShieldCheck },
};

function getHealthLevel(score: number) {
  if (score >= 90) return HEALTH_LABELS[90];
  if (score >= 70) return HEALTH_LABELS[70];
  if (score >= 40) return HEALTH_LABELS[40];
  return HEALTH_LABELS[0];
}

function computeHealthScore(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
): { score: number; breakdown: Record<string, number> } {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recent = transactions.filter((t) => new Date(t.date) >= threeMonthsAgo);

  const income = recent.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const expense = recent.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const savingsRate = income > 0 ? Math.max(0, (income - expense) / income) : 0;

  const budgetScore = budgets.length > 0
    ? budgets.reduce((acc, b) => {
        const util = b.spent / b.amount;
        return acc + (util <= 1 ? 1 - (util * 0.3) : Math.max(0, 0.5 - (util - 1)));
      }, 0) / budgets.length
    : 0.5;

  const days = recent.map((t) => new Date(t.date).toDateString());
  const uniqueDays = new Set(days).size;
  const totalDays = Math.max(1, Math.ceil((now.getTime() - threeMonthsAgo.getTime()) / 86400000));
  const spendingDays = uniqueDays / totalDays;
  const consistencyScore = Math.min(spendingDays * 4, 1);

  const goalProgress = goals.length > 0
    ? goals.reduce((acc, g) => acc + Math.min(g.currentAmount / g.targetAmount, 1), 0) / goals.length
    : 0.5;

  const savingsScore = Math.min(savingsRate * 1.5, 1);
  const breakdown = {
    savings: Math.round(savingsScore * 100),
    budget: Math.round(budgetScore * 100),
    consistency: Math.round(consistencyScore * 100),
    goals: Math.round(goalProgress * 100),
  };

  const score = Math.round(
    savingsScore * 35 + budgetScore * 25 + consistencyScore * 20 + goalProgress * 20
  );

  return { score: Math.max(0, Math.min(100, score)), breakdown };
}

function generateInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  goals: Goal[],
  currency: SharedCurrency,
): Insight[] {
  const now = new Date();
  const insights: Insight[] = [];
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  });

  const thisMonthExpenses = thisMonth.filter((t) => t.type === 'expense');
  const lastMonthExpenses = lastMonth.filter((t) => t.type === 'expense');
  const thisTotal = thisMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const lastTotal = lastMonthExpenses.reduce((s, t) => s + t.amount, 0);

  if (lastTotal > 0) {
    const change = ((thisTotal - lastTotal) / lastTotal) * 100;
    if (change > 20) {
      insights.push({
        id: 'spending-surge',
        type: 'alert',
        severity: 'high',
        title: 'Spending Surge Detected',
        description: `Your expenses are up ${change.toFixed(0)}% compared to last month (${formatCurrency(thisTotal, currency)} vs ${formatCurrency(lastTotal, currency)}). Review your recent transactions to identify where the extra spending is coming from.`,
        icon: TrendingUp,
        color: 'text-negative',
      });
    } else if (change < -15) {
      insights.push({
        id: 'spending-drop',
        type: 'insight',
        severity: 'low',
        title: 'Great Spending Discipline',
        description: `Your expenses dropped ${Math.abs(change).toFixed(0)}% this month — from ${formatCurrency(lastTotal, currency)} to ${formatCurrency(thisTotal, currency)}. Keep up the good work!`,
        icon: TrendingDown,
        color: 'text-positive',
      });
    }
  }

  const catTotals: Record<string, number> = {};
  for (const t of thisMonthExpenses) {
    catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
  }
  const topCat = Object.entries(catTotals).sort(([, a], [, b]) => b - a)[0];
  if (topCat) {
    const cat = categories.find((c) => c.id === topCat[0]);
    const pct = thisTotal > 0 ? ((topCat[1] / thisTotal) * 100).toFixed(0) : '0';
    insights.push({
      id: 'top-category',
      type: 'insight',
      severity: 'medium',
      title: `Top Spending: ${cat?.name || 'Unknown'}`,
      description: `You've spent ${formatCurrency(topCat[1], currency)} on ${cat?.name || 'this category'} this month — that's ${pct}% of your total expenses. ${Number(pct) > 40 ? 'This seems high — consider if there are ways to reduce.' : ''}`,
      icon: Target,
      color: 'text-info',
    });
  }

  for (const budget of budgets) {
    if (budget.spent > budget.amount) {
      const over = budget.spent - budget.amount;
      const cat = categories.find((c) => c.id === budget.categoryId);
      insights.push({
        id: `budget-over-${budget.id}`,
        type: 'alert',
        severity: budget.spent > budget.amount * 1.2 ? 'high' : 'medium',
        title: `${cat?.name || 'Budget'} Over Budget`,
        description: `You've exceeded your ${budget.period} ${cat?.name || ''} budget by ${formatCurrency(over, currency)}. Consider adjusting your spending for the rest of the period.`,
        icon: AlertTriangle,
        color: 'text-warning',
      });
    } else if (budget.spent > budget.amount * 0.8) {
      const cat = categories.find((c) => c.id === budget.categoryId);
      insights.push({
        id: `budget-warning-${budget.id}`,
        type: 'suggestion',
        severity: 'low',
        title: `${cat?.name || 'Budget'} Nearing Limit`,
        description: `You've used ${((budget.spent / budget.amount) * 100).toFixed(0)}% of your ${cat?.name || ''} budget with days remaining. Pace your spending to stay on track.`,
        icon: Lightbulb,
        color: 'text-info',
      });
    }
  }

  for (const goal of goals) {
    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
      const remaining = goal.targetAmount - goal.currentAmount;
      if (daysLeft > 0 && remaining > 0) {
        const neededPerDay = remaining / daysLeft;
        const recentDailyIncome = (() => {
          const last30 = transactions.filter((t) => {
            const d = new Date(t.date);
            return t.type === 'income' && (now.getTime() - d.getTime()) <= 30 * 86400000;
          });
          return last30.reduce((s, t) => s + t.amount, 0) / 30;
        })();
        if (recentDailyIncome > 0 && neededPerDay > recentDailyIncome * 0.3) {
          insights.push({
            id: `goal-atrisk-${goal.id}`,
            type: 'alert',
            severity: 'medium',
            title: `${goal.name} Goal at Risk`,
            description: `You need ${formatCurrency(remaining, currency)} in ${daysLeft} days to reach your ${goal.name} goal. That requires saving ~${formatCurrency(neededPerDay, currency)}/day.`,
            icon: AlertTriangle,
            color: 'text-warning',
          });
        }
      }
      if (daysLeft < 0 && goal.currentAmount < goal.targetAmount) {
        insights.push({
          id: `goal-missed-${goal.id}`,
          type: 'alert',
          severity: 'low',
          title: `${goal.name} Goal Passed Deadline`,
          description: `Your ${goal.name} goal deadline has passed with ${formatCurrency(goal.currentAmount, currency)} saved out of ${formatCurrency(goal.targetAmount, currency)}. Consider extending the deadline or adjusting the target.`,
          icon: Target,
          color: 'text-muted-foreground',
        });
      }
    }
  }

  const recurring = transactions.filter((t) => t.isRecurring);
  if (recurring.length > 0) {
    const recurringTotal = recurring.reduce((s, t) => s + t.amount, 0);
    insights.push({
      id: 'recurring-summary',
      type: 'insight',
      severity: 'low',
      title: `${recurring.length} Recurring Transactions`,
      description: `You have ${recurring.length} recurring transactions totaling ${formatCurrency(recurringTotal, currency)}. Review these to ensure they're all still needed.`,
      icon: RefreshCw,
      color: 'text-accent',
    });
  }

  const income = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = thisMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  if (income > 0) {
    const sr = ((net / income) * 100).toFixed(0);
    if (Number(sr) < 20) {
      insights.push({
        id: 'low-savings',
        type: 'suggestion',
        severity: Number(sr) < 0 ? 'high' : 'medium',
        title: 'Savings Rate Below 20%',
        description: `Your savings rate is ${sr}%. Financial experts recommend saving at least 20% of your income. Look for expenses you can reduce to boost your savings.`,
        icon: PiggyBank,
        color: 'text-warning',
      });
    }
  }

  const avgDaily = thisMonthExpenses.length > 0
    ? thisTotal / [...new Set(thisMonthExpenses.map((t) => new Date(t.date).toDateString()))].length
    : 0;
  if (avgDaily > 0) {
    insights.push({
      id: 'daily-spend',
      type: 'insight',
      severity: 'low',
      title: 'Daily Spending Average',
      description: `You're averaging ${formatCurrency(avgDaily, currency)}/day this month across ${thisMonthExpenses.length} transactions.`,
      icon: DollarSign,
      color: 'text-info',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'no-data',
      type: 'insight',
      severity: 'low',
      title: 'Add More Data for Insights',
      description: 'Import transactions or connect a bank account to unlock AI-powered financial insights.',
      icon: Sparkles,
      color: 'text-muted-foreground',
    });
  }

  return insights;
}

/** Each insight's tone, from its colour role; always shown with an icon and a label, never colour alone. */
const TONES = {
  negative: { well: 'bg-negative/10 ring-negative/20 text-negative', edge: 'from-negative/60' },
  warning: { well: 'bg-warning/10 ring-warning/20 text-warning', edge: 'from-warning/60' },
  info: { well: 'bg-info/10 ring-info/20 text-info', edge: 'from-info/60' },
  positive: { well: 'bg-positive/10 ring-positive/20 text-positive', edge: 'from-positive/60' },
  accent: { well: 'bg-accent/10 ring-accent/20 text-accent', edge: 'from-accent/60' },
  muted: { well: 'bg-foreground/[0.05] ring-border text-muted-foreground', edge: 'from-foreground/20' },
} as const;

function toneOf(insight: Insight) {
  const role = insight.color.replace('text-', '').replace('-foreground', '') as keyof typeof TONES;
  return TONES[role] ?? TONES.info;
}

const TYPE_LABEL: Record<Insight['type'], { label: string; icon: typeof Info }> = {
  alert: { label: 'Alert', icon: AlertTriangle },
  suggestion: { label: 'Suggestion', icon: Lightbulb },
  insight: { label: 'Insight', icon: Info },
};

const RING = 2 * Math.PI * 52;

export default function Insights() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Shared with the advisor page: streaming, markdown, conversation memory and
  // the affordability tool, instead of the older buffered endpoint this panel
  // used to call.
  const { messages, isLoading: isThinking, send: sendChat, retry: retryChat } = useAdvisorChat();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txns, catRes, budgetRes, goalRes] = await Promise.all([
        fetchAllTransactions('', user?.currency || 'USD'),
        api.get('/categories'),
        api.get('/budgets'),
        api.get('/goals'),
      ]);
      setTransactions(txns);
      setCategories(catRes.data.data);
      setBudgets(budgetRes.data.data);
      setGoals(goalRes.data.data);
      setLoadError(null);
    } catch (error) {
      console.error('Insights load failed:', error);
      setLoadError('We could not load your insights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.currency]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const health = useMemo(
    () => computeHealthScore(transactions, budgets, goals),
    [transactions, budgets, goals],
  );

  const insights = useMemo(
    () => generateInsights(transactions, categories, budgets, goals, currency),
    [transactions, categories, budgets, goals, currency],
  );

  const handleSend = () => {
    if (!chatInput.trim() || isThinking) return;
    const question = chatInput.trim();
    setChatInput('');
    void sendChat(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const healthLevel = getHealthLevel(health.score);
  const HealthIcon = healthLevel.icon;
  const ringTone = health.score >= 70 ? 'stroke-positive' : health.score >= 40 ? 'stroke-warning' : 'stroke-negative';

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading insights">
        <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid gap-6 lg:grid-cols-3">
          <CardSkeleton className="h-[420px]" />
          <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
            {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} lines={2} />)}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return <LoadError message={loadError} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description="Smart analysis of your financial health"
        icon={Sparkles}
        tone="accent"
        actions={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TiltCard max={3} className="rounded-xl lg:col-span-1">
          <Card className="h-full overflow-hidden">
            <span aria-hidden className="absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
            <div className="relative flex flex-col items-center pt-2 text-center">
              <div className="relative mb-4 h-36 w-36">
                <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120" aria-hidden>
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="9" className="stroke-foreground/[0.06]" />
                  <m.circle
                    cx="60" cy="60" r="52" fill="none" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={RING}
                    initial={{ strokeDashoffset: RING }}
                    animate={{ strokeDashoffset: RING * (1 - health.score / 100) }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    className={ringTone}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-semibold tracking-tight">
                    <AnimatedNumber value={health.score} from={0} />
                  </span>
                  <span className="text-[11px] text-muted-foreground">out of 100</span>
                </div>
              </div>
              <div className="mb-1 flex items-center gap-2">
                <HealthIcon className={`h-4 w-4 ${healthLevel.color}`} aria-hidden />
                <span className={`text-sm font-semibold ${healthLevel.color}`}>{healthLevel.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">Financial Health Score</p>
            </div>

            <div className="relative mt-6 space-y-3.5 border-t pt-5">
              {Object.entries(health.breakdown).map(([key, value]) => (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs capitalize text-muted-foreground">{key}</span>
                    <span className="text-xs font-medium tabular-nums">{value}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                    <m.div
                      className={`h-full rounded-full ${value >= 70 ? 'bg-positive' : value >= 40 ? 'bg-warning' : 'bg-negative'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TiltCard>

        <div className="space-y-4 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-accent" aria-hidden />
            Smart Insights
          </h2>
          {insights.length === 0 ? (
            <Card>
              <EmptyState icon={Sparkles} title="No insights yet" description="Add more transactions to unlock AI insights" />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                const tone = toneOf(insight);
                const kind = TYPE_LABEL[insight.type];
                return (
                  <InView key={insight.id} index={index} className="h-full">
                    <Card className="h-full overflow-hidden p-4">
                      <span aria-hidden className={cn('absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-gradient-to-b to-transparent', tone.edge)} />
                      <div className="flex gap-3">
                        <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', tone.well)}>
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                              <kind.icon className="h-3 w-3" aria-hidden />
                              {kind.label}
                            </span>
                            {insight.severity === 'high' && (
                              <span className="rounded-full border border-negative/25 bg-negative/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-negative">
                                High priority
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold leading-snug">{insight.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                    </Card>
                  </InView>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        {isThinking && <BorderTrail tone="accent" />}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" aria-hidden />
            Ask FinBrain
          </CardTitle>
          <CardDescription>Follow up on any insight in plain language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 h-[300px] space-y-4 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <p className="mb-4 text-sm text-muted-foreground">Ask me anything about your finances</p>
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                  {[
                    'Can I afford a €1,200 laptop?',
                    'How can I improve my savings rate?',
                    'What if I increase my rent by €200?',
                    'When will I reach my goals?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} onRetry={retryChat} />
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-input bg-surface-sunken/60 p-1.5 pl-3.5 transition-[border-color,box-shadow] focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/15">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your spending, budgets, goals..."
              aria-label="Ask about your spending, budgets, goals"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none"
              disabled={isThinking}
            />
            <Button variant="accent" size="icon" onClick={handleSend} disabled={!chatInput.trim() || isThinking} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
