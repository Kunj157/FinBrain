import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Loader2, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency } from '@finbrain/shared';

interface MonthlySeries {
  dates: string[];
  values: number[];
}

interface ForecastModel {
  forecast: number[];
  model: string;
  accuracy: number | null;
  error?: string;
}

interface ForecastResult {
  monthly_series: {
    income: MonthlySeries;
    expense: MonthlySeries;
    net: MonthlySeries;
  };
  forecasts: Record<string, {
    historical: MonthlySeries;
    models: Record<string, ForecastModel>;
  }>;
  periods: number;
}

type MetricKey = 'income' | 'expense' | 'net';
type ModelKey = 'moving_average' | 'linear_regression' | 'arima' | 'prophet';

const METRIC_OPTIONS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'income', label: 'Income', color: '#34d399' },
  { key: 'expense', label: 'Expenses', color: '#fb7185' },
  { key: 'net', label: 'Net Cash Flow', color: '#60a5fa' },
];

const MODEL_OPTIONS: { key: ModelKey; label: string }[] = [
  { key: 'moving_average', label: 'Moving Average' },
  { key: 'linear_regression', label: 'Linear Regression' },
  { key: 'arima', label: 'ARIMA' },
  { key: 'prophet', label: 'Prophet' },
];

export default function Forecasting() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [data, setData] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periods, setPeriods] = useState(6);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('expense');
  const [selectedModel, setSelectedModel] = useState<ModelKey>('moving_average');

  useEffect(() => {
    fetchForecast();
  }, [periods]);

  async function fetchForecast() {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/forecast', { periods });
      setData(res.data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load forecast';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const currentForecast = useMemo(() => {
    if (!data) return null;
    return data.forecasts[selectedMetric];
  }, [data, selectedMetric]);

  const modelData = useMemo(() => {
    if (!currentForecast) return null;
    return currentForecast.models[selectedModel];
  }, [currentForecast, selectedModel]);

  const summaryStats = useMemo(() => {
    if (!data) return null;
    const net = data.forecasts.net;
    const values = net.historical.values;
    if (values.length === 0) return null;

    const lastMonth = values[values.length - 1] || 0;
    const avgIncome = data.forecasts.income.historical.values.reduce((a, b) => a + b, 0) / Math.max(data.forecasts.income.historical.values.length, 1);
    const avgExpense = data.forecasts.expense.historical.values.reduce((a, b) => a + b, 0) / Math.max(data.forecasts.expense.historical.values.length, 1);
    const avgNet = avgIncome - avgExpense;

    const maForecast = net.models.moving_average.forecast;
    const lrForecast = net.models.linear_regression.forecast;
    const nextMonthForecast = maForecast.length > 0 ? maForecast[0] : avgNet;

    const trend = values.length >= 2 ? values[values.length - 1] - values[values.length - 2] : 0;

    return { lastMonth, avgIncome, avgExpense, avgNet, nextMonthForecast, trend };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecasting</h1>
          <p className="text-sm text-muted-foreground">Predict future income, expenses, and cash flow</p>
        </div>
        <Card className="stat-card">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchForecast}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecasting</h1>
          <p className="text-sm text-muted-foreground">Predict future income, expenses, and cash flow</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Forecast months:</span>
          {[3, 6, 12].map((p) => (
            <Button
              key={p}
              variant={periods === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriods(p)}
              className="h-7 text-xs"
            >
              {p}m
            </Button>
          ))}
        </div>
      </div>

      {summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Monthly Income</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(summaryStats.avgIncome, currency)}</p>
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
                  <p className="text-xs text-muted-foreground">Avg Monthly Expenses</p>
                  <p className="text-lg font-bold text-rose-400">{formatCurrency(summaryStats.avgExpense, currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${summaryStats.avgNet >= 0 ? 'bg-blue-500/10' : 'bg-rose-500/10'}`}>
                  <BarChart3 className={`h-5 w-5 ${summaryStats.avgNet >= 0 ? 'text-blue-400' : 'text-rose-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Monthly Net</p>
                  <p className={`text-lg font-bold ${summaryStats.avgNet >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.avgNet, currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${summaryStats.nextMonthForecast >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                  {summaryStats.trend > 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> :
                   summaryStats.trend < 0 ? <TrendingDown className="h-5 w-5 text-rose-400" /> :
                   <Minus className="h-5 w-5 text-blue-400" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next Month (MA)</p>
                  <p className={`text-lg font-bold ${summaryStats.nextMonthForecast >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.nextMonthForecast, currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex gap-1 p-1 rounded-lg bg-white/5">
          {METRIC_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              variant={selectedMetric === opt.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedMetric(opt.key)}
              className="h-7 text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-white/5">
          {MODEL_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              variant={selectedModel === opt.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedModel(opt.key)}
              className="h-7 text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {METRIC_OPTIONS.find((m) => m.key === selectedMetric)?.label} Forecast — {MODEL_OPTIONS.find((m) => m.key === selectedModel)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentForecast && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Historical: {currentForecast.historical.dates.length} months</span>
                {modelData?.accuracy !== null && modelData?.accuracy !== undefined && (
                  <span>MAPE: {modelData.accuracy}%</span>
                )}
                {modelData?.error && <span className="text-amber-400">{modelData.error}</span>}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Historical Values</p>
                  <div className="flex flex-wrap gap-1">
                    {currentForecast.historical.dates.map((d, i) => (
                      <div key={d} className="text-center">
                        <div
                          className="w-10 h-16 rounded-sm flex items-end justify-center"
                          style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                        >
                          <div
                            className="w-full rounded-sm transition-all"
                            style={{
                              height: `${Math.min(100, Math.max(4, (Math.abs(currentForecast.historical.values[i]) / Math.max(...currentForecast.historical.values.map(Math.abs), 1)) * 100))}%`,
                              backgroundColor: METRIC_OPTIONS.find((m) => m.key === selectedMetric)?.color || '#60a5fa',
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <p className="text-[8px] text-muted-foreground mt-1">{d.slice(0, 7)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {modelData && modelData.forecast.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Forecasted Values</p>
                    <div className="flex flex-wrap gap-1">
                      {modelData.forecast.map((val, i) => (
                        <div key={i} className="text-center">
                          <div
                            className="w-10 h-16 rounded-sm flex items-end justify-center"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                          >
                            <div
                              className="w-full rounded-sm transition-all"
                              style={{
                                height: `${Math.min(100, Math.max(4, (Math.abs(val) / Math.max(...currentForecast.historical.values.map(Math.abs), 1)) * 100))}%`,
                                backgroundColor: METRIC_OPTIONS.find((m) => m.key === selectedMetric)?.color || '#60a5fa',
                                opacity: 1,
                                border: '1px dashed rgba(255,255,255,0.2)',
                              }}
                            />
                          </div>
                          <p className="text-[8px] text-muted-foreground mt-1">+{i + 1}m</p>
                          <p className="text-[9px] font-medium">{formatCurrency(val, currency)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5">
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Month</p>
                  <p className="text-sm font-medium mt-0.5">
                    {formatCurrency(currentForecast.historical.values[currentForecast.historical.values.length - 1] || 0, currency)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Forecast (Next)</p>
                  <p className="text-sm font-medium mt-0.5">
                    {modelData && modelData.forecast.length > 0
                      ? formatCurrency(modelData.forecast[0], currency)
                      : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">3-Month Avg</p>
                  <p className="text-sm font-medium mt-0.5">
                    {formatCurrency(
                      currentForecast.historical.values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, currentForecast.historical.values.length),
                      currency
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">6-Month Avg</p>
                  <p className="text-sm font-medium mt-0.5">
                    {formatCurrency(
                      currentForecast.historical.values.slice(-6).reduce((a, b) => a + b, 0) / Math.min(6, currentForecast.historical.values.length),
                      currency
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">All Models Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Model</th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">Next Month</th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">3-Month</th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">6-Month</th>
                  <th className="text-right py-2 px-4 text-muted-foreground font-medium">MAPE</th>
                  <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {currentForecast && Object.entries(currentForecast.models).map(([key, model]) => {
                  const forecast = model.forecast;
                  const last = currentForecast.historical.values[currentForecast.historical.values.length - 1] || 0;
                  const next = forecast[0] || 0;
                  const avg3 = forecast.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, forecast.length) || 0;
                  const avg6 = forecast.slice(0, 6).reduce((a, b) => a + b, 0) / Math.min(6, forecast.length) || 0;
                  const trend = next - last;

                  return (
                    <tr key={key} className="border-b border-white/[0.02]">
                      <td className="py-2.5 pr-4 font-medium">{MODEL_OPTIONS.find((m) => m.key === key)?.label || key}</td>
                      <td className={`py-2.5 px-4 text-right ${next >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {forecast.length > 0 ? formatCurrency(next, currency) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {forecast.length >= 3 ? formatCurrency(avg3, currency) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {forecast.length >= 6 ? formatCurrency(avg6, currency) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground">
                        {model.accuracy !== null && model.accuracy !== undefined ? `${model.accuracy}%` : '—'}
                      </td>
                      <td className="py-2.5 pl-4 text-right">
                        {forecast.length > 0 ? (
                          <span className={trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-muted-foreground'}>
                            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {formatCurrency(Math.abs(trend), currency)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
