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

export function IncomeExpenseChart({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { income: 0, expense: 0 };
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
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Expenses',
          data: expenseData,
          backgroundColor: 'rgba(244, 63, 94, 0.6)',
          borderColor: '#f43f5e',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [transactions]);

  return (
    <Bar
      data={data}
      options={{
        ...chartDefaults,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b' },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#64748b' },
          },
        },
      }}
    />
  );
}

export function CategoryChart({ transactions, categories }: { transactions: Transaction[]; categories: { id: string; name: string; color: string }[] }) {
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
    const colors = sorted.map(([id]) => catMap.get(id)?.color || '#64748b');

    if (!labels.length) {
      return {
        labels: ['No data'],
        datasets: [{ data: [1], backgroundColor: ['rgba(100, 116, 139, 0.2)'], borderColor: ['rgba(100, 116, 139, 0.3)'], borderWidth: 1 }],
      };
    }

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors.map((c) => `${c}cc`),
          borderColor: colors,
          borderWidth: 2,
        },
      ],
    };
  }, [transactions, categories]);

  return (
    <Doughnut
      data={data}
      options={{
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#64748b',
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
        },
        cutout: '70%',
      }}
    />
  );
}

export function SpendingTrend({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
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
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ],
    };
  }, [transactions]);

  return (
    <Line
      data={data}
      options={{
        ...chartDefaults,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', maxRotation: 0 },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#64748b' },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      }}
    />
  );
}