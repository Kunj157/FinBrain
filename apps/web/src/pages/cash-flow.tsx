import { useState, useMemo, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency, Transaction, Category } from '@finbrain/shared';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      backgroundColor: '#1a1a2e',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
    },
  },
};

export default function CashFlowPage() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [txns, setTxns] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txnRes, catRes] = await Promise.all([
        api.get('/transactions?limit=5000'),
        api.get('/categories'),
      ]);
      setTxns(txnRes.data.data.data);
      setCategories(catRes.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    for (const t of txns) {
      const key = new Date(t.date).toISOString().slice(0, 7);
      if (!months[key]) months[key] = { income: 0, expense: 0 };
      if (t.type === 'income') months[key].income += t.amount;
      else months[key].expense += t.amount;
    }
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([key, data]) => ({
      label: new Date(key + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      ...data,
      net: data.income - data.expense,
    }));
  }, [txns]);

  const totalIncome = useMemo(() => txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [txns]);
  const totalExpense = useMemo(() => txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [txns]);
  const netCashFlow = totalIncome - totalExpense;

  const topIncomeCategories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of txns.filter(t => t.type === 'income')) {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([id, amount]) => ({ id, name: categoryMap[id]?.name || 'Other', color: categoryMap[id]?.color || '#6b7280', amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [txns, categoryMap]);

  const topExpenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of txns.filter(t => t.type === 'expense')) {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([id, amount]) => ({ id, name: categoryMap[id]?.name || 'Other', color: categoryMap[id]?.color || '#6b7280', amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [txns, categoryMap]);

  const barData = useMemo(() => ({
    labels: monthlyData.map((d) => d.label),
    datasets: [
      {
        label: 'Income',
        data: monthlyData.map((d) => d.income),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Expenses',
        data: monthlyData.map((d) => d.expense),
        backgroundColor: 'rgba(244, 63, 94, 0.6)',
        borderColor: 'rgb(244, 63, 94)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }), [monthlyData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash Flow</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your money in vs money out over time</p>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-10 w-10 text-muted-foreground/30 mx-auto animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-emerald-400">{formatCurrency(totalIncome, currency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-rose-400">{formatCurrency(totalExpense, currency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground">Net Cash Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-semibold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow, currency)}
                </p>
              </CardContent>
            </Card>
          </div>

          {monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Monthly Cash Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Bar data={barData} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: true, position: 'top', labels: { color: '#999', boxWidth: 12 } } }, scales: { x: { grid: { display: false }, ticks: { color: '#666' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#666' } } } }} />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top Income Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {topIncomeCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No income data</p>
                ) : (
                  <div className="space-y-3">
                    {topIncomeCategories.map((c) => {
                      const pct = totalIncome > 0 ? (c.amount / totalIncome) * 100 : 0;
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                              <span>{c.name}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(c.amount, currency)}</span>
                          </div>
                          <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/60" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {topExpenseCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No expense data</p>
                ) : (
                  <div className="space-y-3">
                    {topExpenseCategories.map((c) => {
                      const pct = totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0;
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                              <span>{c.name}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(c.amount, currency)}</span>
                          </div>
                          <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-rose-500/60" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
