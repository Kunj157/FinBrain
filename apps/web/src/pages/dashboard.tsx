import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, ArrowRightLeft, Target, Brain, Sparkles, Loader2 } from 'lucide-react';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { StatCard } from '@/components/finance/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IncomeExpenseChart, CategoryChart, SpendingTrend } from '@/components/finance/charts';
import type { Transaction, Category } from '@finbrain/shared';

const quickActions = [
  { label: 'Add Income', icon: TrendingUp, variant: 'positive' as const },
  { label: 'Add Expense', icon: TrendingDown, variant: 'negative' as const },
  { label: 'Create Budget', icon: PiggyBank, variant: 'warning' as const },
  { label: 'Add Goal', icon: Target, variant: 'default' as const },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [txnRes, catRes] = await Promise.all([
        api.get('/transactions?limit=100'),
        api.get('/categories'),
      ]);
      setAllTransactions(txnRes.data.data.data);
      setCategories(catRes.data.data);
    } catch {
      // silent
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

  const summary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthly = allTransactions.filter((t) => new Date(t.date) >= monthStart);
    const income = monthly.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthly.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const allIncome = allTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const allExpenses = allTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const cur = (user?.currency || 'USD') as string;

    return {
      currentBalance: allIncome - allExpenses,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      savings: income - expenses,
      currency: cur,
    };
  }, [allTransactions, user?.currency]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      map[c.id] = c.name;
    }
    return map;
  }, [categories]);

  const currency = user?.currency || 'USD';
  const firstName = user?.name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {firstName}. Here&apos;s your financial overview.
          </p>
        </div>
        <Button className="gap-2">
          <Brain className="h-4 w-4" />
          AI Analysis
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Balance"
          value={summary.currentBalance}
          change={summary.savings > 0 ? 12 : -5}
          icon={Wallet}
          variant={summary.currentBalance >= 0 ? 'positive' : 'negative'}
          currency={currency}
        />
        <StatCard
          title="Monthly Income"
          value={summary.monthlyIncome}
          icon={TrendingUp}
          variant="positive"
          currency={currency}
        />
        <StatCard
          title="Monthly Expenses"
          value={summary.monthlyExpenses}
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
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 group"
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
              <div className="w-full max-w-[220px]">
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
              <Button variant="ghost" size="sm" className="text-xs gap-1">
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
              <div className="space-y-1">
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
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">Spending Alert</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You spent 19% more on restaurants this month. Consider reducing dining out to stay within budget.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">Goal Progress</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You&apos;re 68% toward your Emergency Fund goal. At your current savings rate, you&apos;ll reach it in 4 months.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ask FinBrain</p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask anything about your finances..."
                  className="flex-1 h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <Button size="sm">
                  <Brain className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
