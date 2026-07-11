import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Calendar, Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import type { Transaction, Category, Currency as SharedCurrency } from '@finbrain/shared';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      titleColor: '#e2e8f0',
      bodyColor: '#e2e8f0',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
};

type TimePeriod = '3m' | '6m' | '12m' | 'all';

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '12m', label: '12 Months' },
  { value: 'all', label: 'All Time' },
];

function getPeriodCutoff(period: TimePeriod): Date {
  const now = new Date();
  if (period === '3m') return new Date(now.getFullYear(), now.getMonth() - 3, 1);
  if (period === '6m') return new Date(now.getFullYear(), now.getMonth() - 6, 1);
  if (period === '12m') return new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
  return new Date(2000, 0, 1);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('6m');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txnRes, catRes] = await Promise.all([
        api.get('/transactions?limit=2000'),
        api.get('/categories'),
      ]);
      setTransactions(txnRes.data.data.data);
      setCategories(catRes.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const catMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const cutoff = getPeriodCutoff(period);
    return transactions.filter((t) => new Date(t.date) >= cutoff);
  }, [transactions, period]);

  const stats = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const avgMonthlyExpense = (() => {
      if (filtered.length === 0) return 0;
      const months = new Set(filtered.filter((t) => t.type === 'expense').map((t) => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      }));
      return months.size > 0 ? expense / months.size : 0;
    })();
    return { income, expense, net: income - expense, savingsRate, avgMonthlyExpense };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    const now = new Date();
    const cutoff = getPeriodCutoff(period);
    const monthCount = period === '3m' ? 3 : period === '6m' ? 6 : period === '12m' ? 12 : Math.max(
      Math.ceil((now.getTime() - cutoff.getTime()) / (30 * 86400000)), 1
    );

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { income: 0, expense: 0 };
    }

    for (const txn of filtered) {
      const d = new Date(txn.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        if (txn.type === 'income') months[key].income += txn.amount;
        else months[key].expense += txn.amount;
      }
    }

    const labels = Object.keys(months);
    return {
      labels: labels.map((k) => {
        const [y, m] = k.split('-');
        const date = new Date(Number(y), Number(m) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      income: labels.map((k) => months[k].income),
      expense: labels.map((k) => months[k].expense),
    };
  }, [filtered, period]);

  const categoryBreakdown = useMemo(() => {
    const spending: Record<string, number> = {};
    let total = 0;

    for (const txn of filtered) {
      if (txn.type === 'expense') {
        spending[txn.categoryId] = (spending[txn.categoryId] || 0) + txn.amount;
        total += txn.amount;
      }
    }

    return Object.entries(spending)
      .map(([id, amount]) => ({
        id,
        name: catMap[id]?.name || 'Other',
        color: catMap[id]?.color || '#64748b',
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, catMap]);

  const dayOfWeekData = useMemo(() => {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    for (const txn of filtered) {
      if (txn.type === 'expense') {
        const day = new Date(txn.date).getDay();
        dayTotals[day] += txn.amount;
        dayCounts[day] += 1;
      }
    }

    return {
      labels: DAY_NAMES,
      totals: dayTotals,
      averages: dayTotals.map((t, i) => (dayCounts[i] > 0 ? t / dayCounts[i] : 0)),
    };
  }, [filtered]);

  const topMerchants = useMemo(() => {
    const merchantSpending: Record<string, number> = {};
    for (const txn of filtered) {
      if (txn.type === 'expense' && txn.merchant) {
        merchantSpending[txn.merchant] = (merchantSpending[txn.merchant] || 0) + txn.amount;
      }
    }
    return Object.entries(merchantSpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, amount]) => ({ name, amount }));
  }, [filtered]);

  const monthlyChartData = useMemo(() => ({
    labels: monthlyData.labels,
    datasets: [
      {
        label: 'Income',
        data: monthlyData.income,
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Expenses',
        data: monthlyData.expense,
        backgroundColor: 'rgba(244, 63, 94, 0.6)',
        borderColor: '#f43f5e',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }), [monthlyData]);

  const dayOfWeekChartData = useMemo(() => ({
    labels: DAY_NAMES,
    datasets: [{
      label: 'Avg Spending',
      data: dayOfWeekData.averages,
      backgroundColor: 'rgba(16, 185, 129, 0.5)',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [dayOfWeekData]);

  const trendData = useMemo(() => {
    const cumulativeIncome: number[] = [];
    const cumulativeExpense: number[] = [];
    let incSum = 0;
    let expSum = 0;

    for (let i = 0; i < monthlyData.labels.length; i++) {
      incSum += monthlyData.income[i];
      expSum += monthlyData.expense[i];
      cumulativeIncome.push(incSum);
      cumulativeExpense.push(expSum);
    }

    return {
      labels: monthlyData.labels,
      datasets: [
        {
          label: 'Cumulative Income',
          data: cumulativeIncome,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: 'Cumulative Expenses',
          data: cumulativeExpense,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
      ],
    };
  }, [monthlyData]);

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
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Deep dive into your financial patterns</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-white/5">
          {TIME_PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className="h-7 text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(stats.income, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
                <TrendingDown className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-rose-400">{formatCurrency(stats.expense, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stats.net >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {stats.net >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-400" /> : <ArrowDownRight className="h-5 w-5 text-rose-400" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Cash Flow</p>
                <p className={`text-lg font-bold ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(stats.net, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Savings Rate</p>
                <p className="text-lg font-bold">{stats.savingsRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <Bar data={monthlyChartData} options={{
                ...chartDefaults,
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#64748b' } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
                },
              }} />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cumulative Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <Line data={trendData} options={{
                ...chartDefaults,
                plugins: {
                  ...chartDefaults.plugins,
                  legend: { display: true, position: 'bottom', labels: { color: '#64748b', padding: 16, usePointStyle: true, pointStyle: 'circle' } },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#64748b' } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
                },
                interaction: { intersect: false, mode: 'index' },
              }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Spending by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <Bar data={dayOfWeekChartData} options={{
                ...chartDefaults,
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#64748b' } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
                },
              }} />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No expense data</p>
              ) : categoryBreakdown.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{cat.name}</span>
                  <span className="text-xs font-medium">{formatCurrency(cat.amount, currency)}</span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{cat.percentage.toFixed(0)}%</span>
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top Merchants</CardTitle>
        </CardHeader>
        <CardContent>
          {topMerchants.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No merchant data</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topMerchants.map((m, i) => (
                <div key={m.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                  <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(m.amount, currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
