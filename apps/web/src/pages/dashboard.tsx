import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, ArrowRightLeft, Target, Brain, Sparkles, Building2, Upload, X, Send, Loader2 } from 'lucide-react';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { StatCard } from '@/components/finance/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCardSkeleton, CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { PlaidLinkButton } from '@/components/finance/plaid-link';
import { CsvImport } from '@/components/finance/csv-import';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IncomeExpenseChart, CategoryChart, SpendingTrend } from '@/components/finance/charts';
import { generateInsights, generateAnswer } from '@/lib/insights';
import type { Transaction, Category, Budget, Goal, Currency as SharedCurrency } from '@finbrain/shared';

const quickActions = [
  { label: 'Add Income', icon: TrendingUp, variant: 'positive' as const },
  { label: 'Add Expense', icon: TrendingDown, variant: 'negative' as const },
  { label: 'Create Budget', icon: PiggyBank, variant: 'warning' as const },
  { label: 'Add Goal', icon: Target, variant: 'default' as const },
];

const getStartedCards = [
  {
    icon: Building2,
    title: 'Connect your bank',
    desc: 'Securely import transactions from your bank via Plaid',
    action: 'import-plaid',
  },
  {
    icon: Upload,
    title: 'Import a CSV',
    desc: 'Upload a CSV or PDF bank statement',
    action: 'import-csv',
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingAction, setOnboardingAction] = useState<string | null>(null);
  const [netWorth, setNetWorth] = useState<{ netWorth: number } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchData = useCallback(async () => {
    try {
      const [txnRes, catRes, nwRes, budgetRes, goalRes] = await Promise.all([
        api.get('/transactions?limit=100'),
        api.get('/categories'),
        api.get('/accounts/net-worth').catch(() => null),
        api.get('/budgets').catch(() => ({ data: { data: [] } })),
        api.get('/goals').catch(() => ({ data: { data: [] } })),
      ]);
      setAllTransactions(txnRes.data.data.data);
      setCategories(catRes.data.data);
      setBudgets(budgetRes.data.data);
      setGoals(goalRes.data.data);
      if (nwRes?.data?.data) setNetWorth(nwRes.data.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const onVisible = () => { if (!document.hidden) fetchData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchData]);

  const handleGetStarted = (action: string) => {
    setOnboardingAction(action);
  };

  const summary = useMemo(() => {
    if (allTransactions.length === 0) {
      return { currentBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, savings: 0, currency: user?.currency || 'USD', incomeChange: 0, expenseChange: 0 };
    }

    // Find the most recent transaction date to determine "current" month
    const sortedDates = allTransactions.map((t) => new Date(t.date).getTime()).sort((a, b) => b - a);
    const latestDate = new Date(sortedDates[0]);
    const monthStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
    const lastMonthStart = new Date(latestDate.getFullYear(), latestDate.getMonth() - 1, 1);
    const monthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0, 23, 59, 59);

    const monthly = allTransactions.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });
    const lastMonth = allTransactions.filter((t) => {
      const d = new Date(t.date);
      return d >= lastMonthStart && d < monthStart;
    });

    const income = monthly.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthly.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const lastMonthIncome = lastMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const lastMonthExpenses = lastMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const allIncome = allTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const allExpenses = allTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const incomeChange = lastMonthIncome > 0 ? Math.round(((income - lastMonthIncome) / lastMonthIncome) * 100) : 0;
    const expenseChange = lastMonthExpenses > 0 ? Math.round(((expenses - lastMonthExpenses) / lastMonthExpenses) * 100) : 0;

    const cur = (user?.currency || 'USD') as string;

    return {
      currentBalance: allIncome - allExpenses,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      savings: income - expenses,
      currency: cur,
      incomeChange,
      expenseChange,
    };
  }, [allTransactions, user?.currency]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      map[c.id] = c.name;
    }
    return map;
  }, [categories]);

  const currency = (user?.currency || 'USD') as SharedCurrency;
  const firstName = user?.name?.split(' ')[0] || 'there';

  const insights = useMemo(
    () => generateInsights(allTransactions, categories, budgets, goals, currency),
    [allTransactions, categories, budgets, goals, currency],
  );

  const handleChatSend = async () => {
    if (!chatInput.trim() || isThinking) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsThinking(true);
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    const answer = generateAnswer(question, allTransactions, categories, budgets, goals, currency);
    setChatMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    setIsThinking(false);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    );
  }

  const hasData = allTransactions.length > 0;

  const emptyContent = (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center pt-12 pb-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <Brain className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to <span className="text-gradient">Fin</span>Brain
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Get started by importing your financial data. You can connect your bank,
          upload a statement, or generate sample data to explore.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
        {getStartedCards.map((card) => (
          <button
            key={card.action}
            onClick={() => handleGetStarted(card.action)}
            className="flex flex-col items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 group cursor-pointer text-left"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <card.icon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-sm">{card.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground pt-4">
        Already have data?{' '}
        <button onClick={fetchData} className="text-emerald-400 hover:underline">
          Refresh
        </button>
      </p>
    </div>
  );

  const normalContent = (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {firstName}. Here&apos;s your financial overview.
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/transactions')}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {netWorth && (
          <StatCard
            title="Net Worth"
            value={netWorth.netWorth}
            icon={Wallet}
            variant={netWorth.netWorth >= 0 ? 'positive' : 'negative'}
            currency={currency}
          />
        )}
        <StatCard
          title="Current Balance"
          value={summary.currentBalance}
          icon={Wallet}
          variant={summary.currentBalance >= 0 ? 'positive' : 'negative'}
          currency={currency}
        />
        <StatCard
          title="Monthly Income"
          value={summary.monthlyIncome}
          change={summary.incomeChange}
          icon={TrendingUp}
          variant="positive"
          currency={currency}
        />
        <StatCard
          title="Monthly Expenses"
          value={summary.monthlyExpenses}
          change={summary.expenseChange}
          icon={TrendingDown}
          variant="negative"
          currency={currency}
        />
        <StatCard
          title="Total Savings"
          value={summary.savings}
          icon={PiggyBank}
          variant={summary.savings >= 0 ? 'positive' : 'negative'}
          currency={currency}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              if (action.label === 'Add Income' || action.label === 'Add Expense') navigate('/transactions');
              else if (action.label === 'Create Budget') navigate('/budgets');
              else if (action.label === 'Add Goal') navigate('/goals');
            }}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 group cursor-pointer"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              action.variant === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
              action.variant === 'negative' ? 'bg-rose-500/10 text-rose-400' :
              action.variant === 'warning' ? 'bg-amber-500/10 text-amber-400' :
              'bg-white/[0.04] text-foreground'
            }`}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
            <Plus className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <IncomeExpenseChart transactions={allTransactions} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="w-full max-w-[280px] overflow-hidden">
                <CategoryChart transactions={allTransactions} categories={categories} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <SpendingTrend transactions={allTransactions} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/transactions')}>
                View All
                <ArrowRightLeft className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {allTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">Import your data or add a transaction to get started</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                {allTransactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg p-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                      }`}>
                        <ArrowRightLeft className={`h-4 w-4 ${
                          tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.merchant || tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryMap[tx.categoryId] || 'Other'} · {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-foreground'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                      </p>
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI Insights</CardTitle>
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {allTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Add some transactions to see AI insights</p>
              </div>
            ) : (
              <>
                {insights.slice(0, 2).map((insight) => {
                  const Icon = insight.icon;
                  return (
                    <div
                      key={insight.id}
                      className={`rounded-xl p-4 ${
                        insight.type === 'alert' ? 'bg-gradient-to-br from-rose-500/5 to-orange-500/5 border border-rose-500/10' :
                        insight.type === 'suggestion' ? 'bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10' :
                        'bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${insight.color}`} />
                        <div>
                          <p className={`text-sm font-medium ${insight.color}`}>{insight.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {insights.length > 2 && (
                  <button
                    onClick={() => navigate('/insights')}
                    className="w-full text-center text-xs text-emerald-400 hover:text-emerald-300 transition-colors py-1"
                  >
                    View all {insights.length} insights →
                  </button>
                )}
              </>
            )}

            <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ask FinBrain</p>
              {chatMessages.length > 0 && (
                <div className="mt-3 max-h-[160px] overflow-y-auto space-y-2 scrollbar-thin">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                        msg.role === 'user'
                          ? 'bg-emerald-500/15 text-emerald-50'
                          : 'bg-white/[0.04] text-foreground'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="rounded-lg px-3 py-2 bg-white/[0.04]">
                        <div className="flex items-center gap-1.5">
                          <Brain className="h-3 w-3 text-emerald-400 animate-pulse" />
                          <span className="text-[10px] text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask anything about your finances..."
                  className="flex-1 h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  disabled={isThinking}
                />
                <Button size="sm" onClick={handleChatSend} disabled={!chatInput.trim() || isThinking} className="h-10 px-4">
                  {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      {hasData ? normalContent : emptyContent}
      {onboardingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOnboardingAction(null)} role="dialog" aria-modal="true" aria-labelledby="onboarding-modal-title">
          <div className="w-full max-w-lg mx-4 glass rounded-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 id="onboarding-modal-title" className="text-lg font-semibold">
                {onboardingAction === 'import-plaid' ? 'Connect Your Bank' : 'Import a CSV'}
              </h2>
              <button onClick={() => setOnboardingAction(null)} className="p-1.5 rounded-lg hover:bg-white/[0.04]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              {onboardingAction === 'import-plaid' ? (
                <div className="text-center space-y-6">
                  <Building2 className="h-12 w-12 mx-auto text-emerald-400" />
                  <p className="text-sm text-muted-foreground">
                    Connect securely with Plaid to import your transactions.
                    Sandbox mode is active — no real credentials required.
                  </p>
                  <div className="flex justify-center">
                    <PlaidLinkButton userId={user?.id || 'anon'} onSuccess={() => { setOnboardingAction(null); fetchData(); }} />
                  </div>
                </div>
              ) : (
                <CsvImport onComplete={() => { setOnboardingAction(null); fetchData(); }} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
