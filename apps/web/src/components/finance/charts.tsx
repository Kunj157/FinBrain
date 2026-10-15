import { useMemo } from 'react';
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
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { Transaction } from '@finbrain/shared';
import { areaFill, useChartTheme } from '@/lib/chart-theme';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const base = { responsive: true, maintainAspectRatio: false } as const;

export function IncomeExpenseChart({ transactions }: { transactions: Transaction[] }) {
  const chart = useChartTheme();
  const data = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    // Use the most recent transaction date as reference
    if (transactions.length > 0) {
      const sortedDates = transactions.map((t) => new Date(t.date).getTime()).sort((a, b) => b - a);
      const latestDate = new Date(sortedDates[0]);
      for (let i = 5; i >= 0; i--) {
        const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = { income: 0, expense: 0 };
      }
    } else {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = { income: 0, expense: 0 };
      }
    }

    for (const txn of transactions) {
      const d = new Date(txn.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        if (txn.type === 'income') months[key].income += Math.abs(txn.amount);
        else months[key].expense += Math.abs(txn.amount);
      }
    }

    const labels = Object.keys(months);
    const incomeData = labels.map((k) => months[k].income);
    const expenseData = labels.map((k) => months[k].expense);

    return {
      labels: labels.map((k) => {
        const [y, m] = k.split('-');
        const date = new Date(Number(y), Number(m) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          backgroundColor: chart.positive,
          hoverBackgroundColor: chart.positive,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom' as const,
          barPercentage: 0.8,
          categoryPercentage: 0.55,
        },
        {
          label: 'Expenses',
          data: expenseData,
          backgroundColor: chart.negative,
          hoverBackgroundColor: chart.negative,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom' as const,
          barPercentage: 0.8,
          categoryPercentage: 0.55,
        },
      ],
    };
  }, [transactions, chart]);

  return (
    <Bar
      data={data}
      options={{
        ...base,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, padding: 14, color: chart.ink },
          },
          tooltip: chart.tooltip,
        },
        interaction: { intersect: false, mode: 'index' },
        scales: chart.axes,
      }}
    />
  );
}

export function CategoryChart({ transactions, categories }: { transactions: Transaction[]; categories: { id: string; name: string; color: string }[] }) {
  const chart = useChartTheme();
  const data = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const spending: Record<string, number> = {};

    for (const txn of transactions) {
      if (txn.type === 'expense') {
        spending[txn.categoryId] = (spending[txn.categoryId] || 0) + Math.abs(txn.amount);
      }
    }

    const sorted = Object.entries(spending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    const labels = sorted.map(([id]) => catMap.get(id)?.name || 'Other');
    const values = sorted.map(([, v]) => v);
    // A category keeps the colour the user gave it, so it reads the same here
    // as in every badge; uncoloured ones fall back to the palette in order.
    const colors = sorted.map(([id], i) => catMap.get(id)?.color || chart.series[i % chart.series.length]);

    if (!labels.length) {
      return {
        labels: ['No data'],
        datasets: [{ data: [1], backgroundColor: [chart.grid], borderColor: [chart.surface], borderWidth: 0 }],
      };
    }

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          // A surface-coloured gap between slices instead of an outline.
          borderColor: chart.surface,
          borderWidth: 2,
          borderRadius: 4,
          hoverOffset: 6,
        },
      ],
    };
  }, [transactions, categories, chart]);

  return (
    <Doughnut
      data={data}
      options={{
        ...base,
        plugins: {
          tooltip: chart.tooltip,
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: chart.ink,
              padding: 14,
              boxWidth: 6,
              boxHeight: 6,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
        },
        cutout: '74%',
      }}
    />
  );
}

export function SpendingTrend({ transactions }: { transactions: Transaction[] }) {
  const chart = useChartTheme();
  const data = useMemo(() => {
    const days: Record<string, number> = {};
    // Use the most recent transaction date as reference, not 'now'
    const expenseTxns = transactions.filter((t) => t.type === 'expense' && !t.deletedAt);
    if (expenseTxns.length === 0) {
      // No expense data, use last 30 days from now
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        days[d.toISOString().split('T')[0]] = 0;
      }
    } else {
      // Find the most recent transaction date
      const sortedDates = expenseTxns.map((t) => new Date(t.date).getTime()).sort((a, b) => b - a);
      const latestDate = new Date(sortedDates[0]);
      for (let i = 29; i >= 0; i--) {
        const d = new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate() - i);
        days[d.toISOString().split('T')[0]] = 0;
      }
    }

    for (const txn of transactions) {
      if (txn.type === 'expense') {
        const dateKey = new Date(txn.date).toISOString().split('T')[0];
        if (days[dateKey] !== undefined) {
          days[dateKey] += Math.abs(txn.amount);
        }
      }
    }

    const labels = Object.keys(days);
    const values = Object.values(days);

    return {
      labels: labels.map((d, i) => (i % 5 === 0 ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')),
      datasets: [
        {
          label: 'Daily Spending',
          data: values,
          borderColor: chart.primary,
          backgroundColor: areaFill('primary'),
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: chart.primary,
          pointHoverBorderColor: chart.surface,
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        },
      ],
    };
  }, [transactions, chart]);

  return (
    <Line
      data={data}
      options={{
        ...base,
        plugins: { legend: { display: false }, tooltip: chart.tooltip },
        scales: chart.axes,
        interaction: { intersect: false, mode: 'index' },
      }}
    />
  );
}