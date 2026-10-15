import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, BarChart3, Store,
} from 'lucide-react';
import { ExplainViewButton } from '@/components/finance/explain-view-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/finance/metric-card';
import { InView } from '@/components/motion/in-view';
import { TransitionPanel } from '@/components/motion/transition-panel';
import { areaFill, useChartTheme } from '@/lib/chart-theme';
import { LoadError } from '@/components/ui/load-error';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { fetchAllTransactions } from '@/lib/transactions';
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

const base = { responsive: true, maintainAspectRatio: false } as const;

/** Bars anchored to the baseline with rounded data ends. */
const bar = {
  borderRadius: { topLeft: 4, topRight: 4 },
  borderSkipped: 'bottom' as const,
  barPercentage: 0.8,
  categoryPercentage: 0.6,
};

type TimePeriod = '3m' | '6m' | '12m' | 'all';
type TxnType = 'all' | 'income' | 'expense';

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '12m', label: '12 Months' },
  { value: 'all', label: 'All Time' },
];

const TYPE_FILTERS: { value: TxnType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
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
  const chart = useChartTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringPatterns, setRecurringPatterns] = useState<Array<{ amount: number; frequency: string; monthlyCost: number; merchant: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('6m');
  const [txnType, setTxnType] = useState<TxnType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txns, catRes, recurRes] = await Promise.all([
        fetchAllTransactions('', user?.currency || 'USD'),
        api.get('/categories'),
        api.get('/recurring').catch(() => ({ data: { data: { patterns: [] } } })),
      ]);
      setTransactions(txns);
      setCategories(catRes.data.data);
      setRecurringPatterns(recurRes.data.data?.patterns || []);
      setLoadError(null);
    } catch (error) {
      console.error('Analytics load failed:', error);
      setLoadError('We could not load your analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.currency]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const catMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const cutoff = getPeriodCutoff(period);
    return transactions.filter((t) => {
      if (new Date(t.date) < cutoff) return false;
      if (txnType !== 'all' && t.type !== txnType) return false;
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [transactions, period, txnType, categoryFilter]);

  const stats = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
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
        color: catMap[id]?.color || chart.ink,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, catMap, chart]);

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

  const yoyData = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;
    const months: Record<string, { thisYear: number; lastYear: number }> = {};
    for (let i = 0; i < 12; i++) {
      const key = String(i + 1).padStart(2, '0');
      months[key] = { thisYear: 0, lastYear: 0 };
    }
    for (const txn of transactions) {
      if (txn.type !== 'expense') continue;
      const d = new Date(txn.date);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      if (d.getFullYear() === thisYear) months[m].thisYear += txn.amount;
      else if (d.getFullYear() === lastYear) months[m].lastYear += txn.amount;
    }
    const labels = Object.keys(months).map((m) => {
      const d = new Date(2024, Number(m) - 1);
      return d.toLocaleDateString('en-US', { month: 'short' });
    });
    return {
      labels,
      datasets: [
        { label: String(thisYear), data: Object.values(months).map((m) => m.thisYear), backgroundColor: chart.series[0], ...bar },
        { label: String(lastYear), data: Object.values(months).map((m) => m.lastYear), backgroundColor: chart.series[1], ...bar },
      ],
    };
  }, [transactions, chart]);

  const cashFlowForecast = useMemo(() => {
    const now = new Date();
    const recent = transactions.filter((t) => {
      const d = new Date(t.date);
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return d >= threeMonthsAgo;
    });

    let avgIncome = 0, avgExpense = 0;
    const months = new Set(recent.map((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })).size || 1;
    for (const t of recent) {
      if (t.type === 'income') avgIncome += Math.abs(t.amount);
      else avgExpense += Math.abs(t.amount);
    }
    avgIncome /= months;
    avgExpense /= months;

    const recurringExpense = recurringPatterns.reduce((s, p) => s + p.monthlyCost, 0);
    const nonRecurringExpense = Math.max(0, avgExpense - recurringExpense);
    const netMonthly = avgIncome - avgExpense;

    const currentBalance = transactions.reduce((s, t) => s + (t.type === 'income' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);

    const months30 = [30, 60, 90].map((days) => ({
      days,
      label: `${days} days`,
      balance: currentBalance + netMonthly * (days / 30),
    }));

    const monthlyProjections = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const label = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const projectedBalance = currentBalance + netMonthly * (i + 1);
      return { month: i + 1, label, balance: Math.round(projectedBalance * 100) / 100 };
    });

    return {
      forecast: months30,
      monthlyProjections,
      netMonthly,
      avgIncome,
      avgExpense,
      recurringExpense: Math.round(recurringExpense * 100) / 100,
      nonRecurringExpense: Math.round(nonRecurringExpense * 100) / 100,
      currentBalance: Math.round(currentBalance * 100) / 100,
    };
  }, [transactions, recurringPatterns]);

  const monthlyChartData = useMemo(() => ({
    labels: monthlyData.labels,
    datasets: [
      {
        label: 'Income',
        data: monthlyData.income,
        backgroundColor: chart.positive,
        ...bar,
      },
      {
        label: 'Expenses',
        data: monthlyData.expense,
        backgroundColor: chart.negative,
        ...bar,
      },
    ],
  }), [monthlyData, chart]);

  const dayOfWeekChartData = useMemo(() => ({
    labels: DAY_NAMES,
    datasets: [{
      label: 'Avg Spending',
      data: dayOfWeekData.averages,
      backgroundColor: chart.primary,
      ...bar,
    }],
  }), [dayOfWeekData, chart]);

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
          borderColor: chart.positive,
          backgroundColor: areaFill('positive', 0.22),
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderColor: chart.surface,
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        },
        {
          label: 'Cumulative Expenses',
          data: cumulativeExpense,
          borderColor: chart.negative,
          backgroundColor: areaFill('negative', 0.18),
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderColor: chart.surface,
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        },
      ],
    };
  }, [monthlyData, chart]);

  const legend = {
    display: true,
    position: 'top' as const,
    align: 'end' as const,
    labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, padding: 14, color: chart.ink },
  };
  const barOptions = (withLegend: boolean) => ({
    ...base,
    plugins: { legend: withLegend ? legend : { display: false }, tooltip: chart.tooltip },
    interaction: { intersect: false, mode: 'index' as const },
    scales: chart.axes,
  });

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
        <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} lines={0} className="h-[88px]" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2"><CardSkeleton className="h-80" /><CardSkeleton className="h-80" /></div>
      </div>
    );
  }

  if (loadError) {
    return <LoadError message={loadError} onRetry={fetchData} />;
  }

  // Panels slide in from the side the period moved toward.
  const periodIndex = TIME_PERIODS.findIndex((p) => p.value === period);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        description="Deep dive into your financial patterns"
        actions={
          <>
            <ExplainViewButton viewName="Analytics" />
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              ariaLabel="Category"
              className="h-9 w-44"
              options={[{ value: 'all', label: 'All Categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <Segmented id="analytics-type" label="Transaction type" value={txnType} onChange={setTxnType} options={TYPE_FILTERS} />
            <Segmented id="analytics-period" label="Time period" value={period} onChange={setPeriod} options={TIME_PERIODS} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Income" value={stats.income} icon={TrendingUp} tone="positive" currency={currency} />
        <MetricCard label="Total Expenses" value={stats.expense} icon={TrendingDown} tone="negative" currency={currency} />
        <MetricCard
          label="Net Cash Flow"
          value={stats.net}
          icon={stats.net >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={stats.net >= 0 ? 'positive' : 'negative'}
          valueTone={stats.net >= 0 ? 'positive' : 'negative'}
          currency={currency}
        />
        <MetricCard label="Savings Rate" value={stats.savingsRate} icon={Calendar} tone="info" percent />
      </div>

      <TransitionPanel activeKey={`${period}-${txnType}-${categoryFilter}`} direction={periodIndex >= 1 ? 1 : -1} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InView index={0}>
            <Card className="h-full">
              <CardHeader><CardTitle>Monthly Income vs Expenses</CardTitle><CardDescription>Totals per month for the selected period</CardDescription></CardHeader>
              <CardContent><div className="h-[260px]"><Bar data={monthlyChartData} options={barOptions(true)} /></div></CardContent>
            </Card>
          </InView>
          <InView index={1}>
            <Card className="h-full">
              <CardHeader><CardTitle>Cumulative Trend</CardTitle><CardDescription>Running totals across the period</CardDescription></CardHeader>
              <CardContent><div className="h-[260px]"><Line data={trendData} options={barOptions(true)} /></div></CardContent>
            </Card>
          </InView>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InView index={2}>
            <Card className="h-full">
              <CardHeader><CardTitle>Spending by Day of Week</CardTitle><CardDescription>Average expense per transaction</CardDescription></CardHeader>
              <CardContent><div className="h-[220px]"><Bar data={dayOfWeekChartData} options={barOptions(false)} /></div></CardContent>
            </Card>
          </InView>
          <InView index={3}>
            <Card className="h-full">
              <CardHeader><CardTitle>Category Breakdown</CardTitle><CardDescription>Share of spending by category</CardDescription></CardHeader>
              <CardContent>
                <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
                  {categoryBreakdown.length === 0 ? (
                    <EmptyState icon={BarChart3} title="No expense data" description="Nothing was spent in this period." className="py-6" />
                  ) : categoryBreakdown.map((cat) => (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center gap-2.5 text-xs">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="flex-1 truncate text-muted-foreground">{cat.name}</span>
                        <span className="font-medium tabular-nums">{formatCurrency(cat.amount, currency)}</span>
                        <span className="w-10 text-right tabular-nums text-muted-foreground">{cat.percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </InView>
        </div>

        <InView index={4}>
          <Card>
            <CardHeader><CardTitle>Top Merchants</CardTitle><CardDescription>Where most of the money went</CardDescription></CardHeader>
            <CardContent>
              {topMerchants.length === 0 ? (
                <EmptyState icon={Store} title="No merchant data" description="Merchants appear once expenses name them." className="py-6" />
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                  {topMerchants.map((m, i) => (
                    <div key={m.name} className="flex items-center gap-3 rounded-lg border bg-foreground/[0.02] p-2.5 transition-colors hover:border-border-strong">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05] font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{m.name}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{formatCurrency(m.amount, currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </InView>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InView index={5}>
            <Card className="h-full">
              <CardHeader><CardTitle>Year-over-Year Spending</CardTitle><CardDescription>This year against last, month by month</CardDescription></CardHeader>
              <CardContent><div className="h-[260px]"><Bar data={yoyData} options={barOptions(true)} /></div></CardContent>
            </Card>
          </InView>
          <InView index={6}>
            <Card className="h-full">
              <CardHeader><CardTitle>Cash Flow Projection</CardTitle><CardDescription>From your average of the last three months</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {cashFlowForecast.forecast.map((f) => (
                      <div key={f.days} className="rounded-lg border bg-foreground/[0.02] p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
                        <p className={`mt-1 truncate text-lg font-semibold tabular-nums ${f.balance >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {formatCurrency(f.balance, currency)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">6-Month Projection</p>
                    {cashFlowForecast.monthlyProjections.map((p) => (
                      <div key={p.month} className="flex items-center gap-3">
                        <span className="w-12 text-[10px] text-muted-foreground">{p.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                          <div
                            className={`h-full rounded-full transition-all ${p.balance >= 0 ? 'bg-positive' : 'bg-negative'}`}
                            style={{ width: `${Math.min(100, Math.max(2, (Math.abs(p.balance) / Math.max(cashFlowForecast.currentBalance * 2, 1)) * 100))}%` }}
                          />
                        </div>
                        <span className={`w-20 text-right text-xs font-medium tabular-nums ${p.balance >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {formatCurrency(p.balance, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
                    <span>Recurring: <span className="text-negative">{formatCurrency(cashFlowForecast.recurringExpense, currency)}/mo</span></span>
                    <span>Variable: <span className="text-warning">{formatCurrency(cashFlowForecast.nonRecurringExpense, currency)}/mo</span></span>
                    <span>Net: <span className={cashFlowForecast.netMonthly >= 0 ? 'text-positive' : 'text-negative'}>{formatCurrency(cashFlowForecast.netMonthly, currency)}/mo</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </InView>
        </div>
      </TransitionPanel>
    </div>
  );
}
