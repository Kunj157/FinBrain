import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '@/lib/api';
import type { Currency as SharedCurrency } from '@finbrain/shared';
import { formatCurrency } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface NetWorthPoint {
  month: string;
  netWorth: number;
}

const PERIODS = [
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: 'All', months: 60 },
] as const;

export function NetWorthTrend({ currency }: { currency: SharedCurrency }) {
  const [period, setPeriod] = useState(12);
  const [data, setData] = useState<NetWorthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/net-worth/history', { params: { months: period } });
      setData(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const chartData = useMemo(() => {
    if (!data.length) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.05)', fill: true }],
      };
    }

    return {
      labels: data.map((d) => {
        const [y, m] = d.month.split('-');
        return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      datasets: [
        {
          label: 'Net Worth',
          data: data.map((d) => d.netWorth),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: data.length <= 12 ? 3 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#10b981',
          borderWidth: 2,
        },
      ],
    };
  }, [data]);

  const currentNW = data.length > 0 ? data[data.length - 1].netWorth : 0;
  const startNW = data.length > 0 ? data[0].netWorth : 0;
  const change = startNW !== 0 ? ((currentNW - startNW) / Math.abs(startNW)) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Net Worth Trend</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-semibold">{formatCurrency(currentNW, currency)}</span>
            {data.length > 1 && (
              <span className={`text-xs ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}% over period
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.months}
              onClick={() => setPeriod(p.months)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === p.months
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[220px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground/50">
            Loading...
          </div>
        ) : (
          <Line
            data={chartData}
            options={{
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
                  callbacks: {
                    label: (ctx) => formatCurrency(ctx.parsed.y ?? 0, currency),
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: '#64748b', maxRotation: 0 },
                },
                y: {
                  grid: { color: 'rgba(255,255,255,0.03)' },
                  ticks: {
                    color: '#64748b',
                    callback: (val) => formatCurrency(Number(val), currency),
                  },
                },
              },
              interaction: { intersect: false, mode: 'index' },
            }}
          />
        )}
      </div>
    </div>
  );
}
