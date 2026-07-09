import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, ArrowRightLeft, Target } from 'lucide-react';
import { StatCard } from '@/components/finance/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles } from 'lucide-react';

const quickActions = [
  { label: 'Add Income', icon: TrendingUp, variant: 'positive' as const },
  { label: 'Add Expense', icon: TrendingDown, variant: 'negative' as const },
  { label: 'Create Budget', icon: PiggyBank, variant: 'warning' as const },
  { label: 'Add Goal', icon: Target, variant: 'default' as const },
];

const recentTransactions = [
  { merchant: 'Amazon', amount: -89.99, category: 'Shopping', date: 'Today', status: 'cleared' as const },
  { merchant: 'Starbucks', amount: -5.75, category: 'Food & Drink', date: 'Today', status: 'cleared' as const },
  { merchant: 'Salary Deposit', amount: 4500, category: 'Income', date: 'Yesterday', status: 'cleared' as const },
  { merchant: 'Netflix', amount: -15.99, category: 'Entertainment', date: '2 days ago', status: 'cleared' as const },
  { merchant: 'Uber', amount: -24.50, category: 'Transport', date: '2 days ago', status: 'cleared' as const },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, Kunj. Here&apos;s your financial overview.
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
          value={12450}
          change={12}
          icon={Wallet}
          variant="positive"
        />
        <StatCard
          title="Monthly Income"
          value={8500}
          change={8}
          icon={TrendingUp}
          variant="positive"
        />
        <StatCard
          title="Monthly Expenses"
          value={4230}
          change={-3}
          icon={TrendingDown}
          variant="negative"
        />
        <StatCard
          title="Total Savings"
          value={8220}
          change={15}
          icon={PiggyBank}
          variant="positive"
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
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All
                <ArrowRightLeft className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentTransactions.map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                    }`}>
                      <ArrowRightLeft className={`h-4 w-4 ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.merchant}</p>
                      <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-foreground'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                    </p>
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      Cleared
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
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
