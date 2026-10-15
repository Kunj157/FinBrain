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
import { areaFill, useChartTheme } from '@/lib/chart-theme';
import { ActiveHighlight } from '@/components/motion/animated-background';
import { Skeleton } from '@/components/ui/skeleton';

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
  const chart = useChartTheme();

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
        datasets: [{ data: [0], borderColor: chart.primary, backgroundColor: areaFill('primary'), fill: true }],
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
  }, [data, chart]);

  const currentNW = data.length > 0 ? data[data.length - 1].netWorth : 0;
  const startNW = data.length > 0 ? data[0].netWorth : 0;
  const change = startNW !== 0 ? ((currentNW - startNW) / Math.abs(startNW)) * 100 : 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Net Worth Trend</h3>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(currentNW, currency)}</span>
            {data.length > 1 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums ${change >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}% over period
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 rounded-lg border bg-surface-sunken/60 p-0.5" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.months}
              onClick={() => setPeriod(p.months)}
              aria-pressed={period === p.months}
              className={`relative isolate rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p.months ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {period === p.months && (
                <ActiveHighlight layoutId="net-worth-period" className="rounded-md bg-card shadow-raised ring-1 ring-border" />
              )}
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[220px]">
        {loading ? (
          <Skeleton className="h-full rounded-xl" />
        ) : (
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  ...chart.tooltip,
                  callbacks: {
                    label: (ctx) => formatCurrency(ctx.parsed.y ?? 0, currency),
                  },
                },
              },
              scales: {
                x: chart.axes.x,
                y: {
                  ...chart.axes.y,
                  ticks: {
                    ...chart.axes.y.ticks,
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
