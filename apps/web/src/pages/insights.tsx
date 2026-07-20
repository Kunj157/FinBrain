import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles, Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  ShieldCheck, ShieldAlert, ShieldX, Send, Loader2,
  DollarSign, PiggyBank, Target, Zap, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { sendChatMessage } from '@/lib/ai-chat';
import { formatCurrency } from '@/lib/utils';
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

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const HEALTH_LABELS: Record<number, { label: string; color: string; icon: typeof ShieldCheck }> = {
  0: { label: 'Critical', color: 'text-rose-400', icon: ShieldX },
  40: { label: 'Needs Work', color: 'text-amber-400', icon: ShieldAlert },
  70: { label: 'Good', color: 'text-emerald-400', icon: ShieldCheck },
  90: { label: 'Excellent', color: 'text-emerald-300', icon: ShieldCheck },
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
        color: 'text-rose-400',
      });
    } else if (change < -15) {
      insights.push({
        id: 'spending-drop',
        type: 'insight',
        severity: 'low',
        title: 'Great Spending Discipline',
        description: `Your expenses dropped ${Math.abs(change).toFixed(0)}% this month — from ${formatCurrency(lastTotal, currency)} to ${formatCurrency(thisTotal, currency)}. Keep up the good work!`,
        icon: TrendingDown,
        color: 'text-emerald-400',
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
      color: 'text-blue-400',
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
        color: 'text-amber-400',
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
        color: 'text-blue-400',
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
            color: 'text-amber-400',
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
      color: 'text-purple-400',
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
        color: 'text-amber-400',
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
      color: 'text-blue-400',
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

export default function Insights() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txnRes, catRes, budgetRes, goalRes] = await Promise.all([
        api.get('/transactions?limit=5000'),
        api.get('/categories'),
        api.get('/budgets'),
        api.get('/goals'),
      ]);
      setTransactions(txnRes.data.data.data);
      setCategories(catRes.data.data);
      setBudgets(budgetRes.data.data);
      setGoals(goalRes.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const health = useMemo(
    () => computeHealthScore(transactions, budgets, goals),
    [transactions, budgets, goals],
  );

  const insights = useMemo(
    () => generateInsights(transactions, categories, budgets, goals, currency),
    [transactions, categories, budgets, goals, currency],
  );

  const handleSend = async () => {
    if (!chatInput.trim() || isThinking) return;
    const question = chatInput.trim();
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsThinking(true);
    try {
      const answer = await sendChatMessage(question, messages);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (err as Error)?.message
        || 'An error occurred. Make sure the backend is running.';
      setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const healthLevel = getHealthLevel(health.score);
  const HealthIcon = healthLevel.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-sm text-muted-foreground">Smart analysis of your financial health</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="stat-card lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8"
                    className="text-white/5" />
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(health.score / 100) * 327} 327`}
                    className={
                      health.score >= 70 ? 'stroke-emerald-400' :
                      health.score >= 40 ? 'stroke-amber-400' : 'stroke-rose-400'
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{health.score}</span>
                  <span className="text-[10px] text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <HealthIcon className={`h-4 w-4 ${healthLevel.color}`} />
                <span className={`text-sm font-medium ${healthLevel.color}`}>{healthLevel.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">Financial Health Score</p>
            </div>

            <div className="mt-6 space-y-3">
              {Object.entries(health.breakdown).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground capitalize">{key}</span>
                    <span className="text-xs font-medium">{value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        value >= 70 ? 'bg-emerald-400' : value >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Smart Insights
          </h2>
          {insights.length === 0 ? (
            <Card className="stat-card">
              <CardContent className="p-8 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Add more transactions to unlock AI insights</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <Card key={insight.id} className="stat-card">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                          insight.type === 'alert' ? 'bg-rose-500/10' :
                          insight.type === 'suggestion' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                        }`}>
                          <Icon className={`h-4 w-4 ${insight.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-medium truncate">{insight.title}</p>
                            {insight.severity === 'high' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 flex-shrink-0">
                                HIGH
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Card className="stat-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-emerald-400" />
            Ask FinBrain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] overflow-y-auto mb-4 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Brain className="h-8 w-8 text-emerald-400/20 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Ask me anything about your finances</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {[
                    'Can I afford a €1,200 laptop?',
                    'How can I improve my savings rate?',
                    'What if I increase my rent by €200?',
                    'When will I reach my goals?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-500/15 text-emerald-50'
                    : 'bg-white/[0.04] text-foreground'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Brain className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] font-medium text-emerald-400">FinBrain</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="rounded-xl px-4 py-3 bg-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3 text-emerald-400 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your spending, budgets, goals..."
              className="flex-1 h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              disabled={isThinking}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!chatInput.trim() || isThinking}
              className="h-10 px-4"
            >
              {isThinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
