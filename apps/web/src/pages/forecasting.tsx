import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Loader2, BarChart3,
  Plus, X, Check, GitCompare,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Segmented } from '@/components/ui/segmented';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/finance/metric-card';
import { TransitionPanel } from '@/components/motion/transition-panel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency } from '@finbrain/shared';
import { Chart as ChartJS, BarElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { areaFill, token, useChartTheme } from '@/lib/chart-theme';

ChartJS.register(BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

/** The token each metric is drawn in. */
const METRIC_TOKEN: Record<MetricKey, string> = { income: 'positive', expense: 'negative', net: 'info' };

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
type TabKey = 'forecast' | 'scenarios' | 'net-worth';

const METRIC_OPTIONS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'income', label: 'Income', color: 'hsl(var(--positive))' },
  { key: 'expense', label: 'Expenses', color: 'hsl(var(--negative))' },
  { key: 'net', label: 'Net Cash Flow', color: 'hsl(var(--info))' },
];

const TABS: { value: TabKey; label: string }[] = [
  { value: 'forecast', label: 'Cash Flow' },
  { value: 'scenarios', label: 'Scenarios' },
  { value: 'net-worth', label: 'Net Worth' },
];

const HORIZONS = [
  { value: '3', label: '3m' },
  { value: '6', label: '6m' },
  { value: '12', label: '12m' },
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
  const [activeTab, setActiveTab] = useState<TabKey>('forecast');
  const [scenarios, setScenarios] = useState<Array<{ id: string; name: string; scenarioType: string; result: Record<string, unknown>; createdAt: string }>>([]);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [scenarioForm, setScenarioForm] = useState({ name: '', scenarioType: 'purchase', input: '{}' });
  const [creatingScenario, setCreatingScenario] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<Array<{ id: string; name: string; result: Record<string, unknown> }>>([]);
  const [netWorthProj, setNetWorthProj] = useState<{ currentNetWorth: number; monthlyNetFlow: number; projections: Array<{ month: string; netWorth: number }> } | null>(null);

  const fetchForecast = useCallback(async () => {
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
  }, [periods]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  useEffect(() => {
    if (activeTab === 'scenarios') {
      api.get('/advisor/scenarios').then((r) => setScenarios(r.data.data)).catch(() => {});
    }
    if (activeTab === 'net-worth') {
      api.get('/advisor/net-worth-projection?months=24').then((r) => setNetWorthProj(r.data.data)).catch(() => {});
    }
  }, [activeTab]);

  async function handleCreateScenario() {
    if (!scenarioForm.name) return;
    setCreatingScenario(true);
    try {
      const input = JSON.parse(scenarioForm.input || '{}');
      const res = await api.post('/advisor/scenarios', {
        name: scenarioForm.name,
        scenarioType: scenarioForm.scenarioType,
        input,
      });
      setScenarios((prev) => [res.data.data ? { ...res.data.data, id: `temp-${Date.now()}`, name: scenarioForm.name, scenarioType: scenarioForm.scenarioType, result: res.data.data, createdAt: new Date().toISOString() } : prev]);
      setShowScenarioForm(false);
      setScenarioForm({ name: '', scenarioType: 'purchase', input: '{}' });
      const r = await api.get('/advisor/scenarios');
      setScenarios(r.data.data);
    } catch { /* silent */ }
    setCreatingScenario(false);
  }

  async function handleCompare() {
    if (compareIds.length < 2) return;
    try {
      const res = await api.post('/advisor/scenarios/compare', { ids: compareIds });
      setCompareData(res.data.data);
    } catch { /* silent */ }
  }

  async function handleDeleteScenario(id: string) {
    try {
      await api.delete(`/advisor/scenarios/${id}`);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    } catch { /* silent */ }
  }

  const currentForecast = useMemo(() => {
    if (!data) return null;
    return data.forecasts[selectedMetric];
  }, [data, selectedMetric]);

  const modelData = useMemo(() => {
    if (!currentForecast) return null;
    return currentForecast.models[selectedModel];
  }, [currentForecast, selectedModel]);

  const chart = useChartTheme();

  // History as solid bars, the selected model's forecast as outlined bars after it.
  const forecastChart = useMemo(() => {
    const hist = currentForecast?.historical ?? { dates: [], values: [] };
    const ahead = modelData?.forecast ?? [];
    const name = METRIC_TOKEN[selectedMetric];
    const bar = { borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom' as const, barPercentage: 0.85, categoryPercentage: 0.8 };
    return {
      labels: [...hist.dates.map((d) => d.slice(0, 7)), ...ahead.map((_, i) => `+${i + 1}m`)],
      datasets: [
        { label: 'Historical', data: [...hist.values, ...ahead.map(() => null)], backgroundColor: token(name, 0.85), ...bar },
        {
          label: 'Forecast',
          data: [...hist.values.map(() => null), ...ahead],
          backgroundColor: token(name, 0.18),
          borderColor: token(name),
          borderWidth: 1.5,
          ...bar,
        },
      ],
    };
    // `chart` re-reads the tokens when the theme flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentForecast, modelData, selectedMetric, chart]);

  const forecastOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, align: 'end' as const, labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 8, boxHeight: 8, color: chart.ink } },
      tooltip: chart.tooltip,
    },
    scales: { ...chart.axes, x: { ...chart.axes.x, stacked: true }, y: { ...chart.axes.y, stacked: false } },
  };

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
    const nextMonthForecast = maForecast.length > 0 ? maForecast[0] : avgNet;

    const trend = values.length >= 2 ? values[values.length - 1] - values[values.length - 2] : 0;

    return { lastMonth, avgIncome, avgExpense, avgNet, nextMonthForecast, trend };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading forecast">
        <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-80" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} lines={0} className="h-[88px]" />)}
        </div>
        <CardSkeleton className="h-80" />
      </div>
    );
  }

  const header = (actions?: React.ReactNode) => (
    <PageHeader
      icon={TrendingUp}
      title="Forecasting"
      description="Predict future income, expenses, and cash flow"
      actions={actions}
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header()}
        <Card>
          <EmptyState
            icon={BarChart3}
            title="Forecast unavailable"
            description={error}
            action={<Button variant="outline" size="sm" onClick={fetchForecast}>Try Again</Button>}
          />
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {header(
        <>
          <Segmented id="forecast-tab" label="View" value={activeTab} onChange={setActiveTab} options={TABS} />
          {activeTab === 'forecast' && (
            <Segmented
              id="forecast-horizon"
              label="Months to forecast"
              value={String(periods)}
              onChange={(value) => setPeriods(Number(value))}
              options={HORIZONS}
            />
          )}
        </>,
      )}

      <TransitionPanel
        activeKey={activeTab}
        direction={TABS.findIndex((t) => t.value === activeTab) > 0 ? 1 : -1}
        className="space-y-6"
      >

      {activeTab === 'forecast' && (<>
        {summaryStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Avg Monthly Income" value={summaryStats.avgIncome} icon={TrendingUp} tone="positive" currency={currency} />
          <MetricCard label="Avg Monthly Expenses" value={summaryStats.avgExpense} icon={TrendingDown} tone="negative" currency={currency} />
          <MetricCard
            label="Avg Monthly Net"
            value={summaryStats.avgNet}
            icon={BarChart3}
            tone={summaryStats.avgNet >= 0 ? 'info' : 'negative'}
            valueTone={summaryStats.avgNet >= 0 ? undefined : 'negative'}
            currency={currency}
          />
          <MetricCard
            label="Next Month (MA)"
            value={summaryStats.nextMonthForecast}
            icon={summaryStats.trend > 0 ? TrendingUp : summaryStats.trend < 0 ? TrendingDown : Minus}
            tone={summaryStats.trend > 0 ? 'positive' : summaryStats.trend < 0 ? 'negative' : 'info'}
            valueTone={summaryStats.nextMonthForecast >= 0 ? 'positive' : 'negative'}
            currency={currency}
          />
        </div>
      )}

      {/* Both groups wrap: side by side they exceed the content width at
          common laptop sizes, which pushed the last model tab off-screen and
          gave the whole page a horizontal scrollbar. */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          id="forecast-metric"
          label="Metric"
          value={selectedMetric}
          onChange={setSelectedMetric}
          options={METRIC_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label }))}
        />
        <Segmented
          id="forecast-model"
          label="Model"
          value={selectedModel}
          onChange={setSelectedModel}
          options={MODEL_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {METRIC_OPTIONS.find((m) => m.key === selectedMetric)?.label} Forecast — {MODEL_OPTIONS.find((m) => m.key === selectedModel)?.label}
          </CardTitle>
          <CardDescription>Solid bars are history; outlined bars are the forecast</CardDescription>
        </CardHeader>
        <CardContent>
          {currentForecast && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Historical: {currentForecast.historical.dates.length} months</span>
                {modelData?.accuracy !== null && modelData?.accuracy !== undefined && (
                  <span>MAPE: {modelData.accuracy}%</span>
                )}
                {modelData?.error && <span className="text-warning">{modelData.error}</span>}
              </div>

              <div className="h-[260px]">
                <Bar data={forecastChart} options={forecastOptions} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-foreground/5">
                <div className="rounded-lg border bg-foreground/[0.02] p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Month</p>
                  <p className="text-sm font-medium mt-0.5">
                    {formatCurrency(currentForecast.historical.values[currentForecast.historical.values.length - 1] || 0, currency)}
                  </p>
                </div>
                <div className="rounded-lg border bg-foreground/[0.02] p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Forecast (Next)</p>
                  <p className="text-sm font-medium mt-0.5">
                    {modelData && modelData.forecast.length > 0
                      ? formatCurrency(modelData.forecast[0], currency)
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg border bg-foreground/[0.02] p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">3-Month Avg</p>
                  <p className="text-sm font-medium mt-0.5">
                    {formatCurrency(
                      currentForecast.historical.values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, currentForecast.historical.values.length),
                      currency
                    )}
                  </p>
                </div>
                <div className="rounded-lg border bg-foreground/[0.02] p-3">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>All Models Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-foreground/5">
                  <th className="py-2 pr-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Model</th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Next Month</th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">3-Month</th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">6-Month</th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">MAPE</th>
                  <th className="py-2 pl-4 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Trend</th>
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
                    <tr key={key} className="border-b border-border/60 transition-colors hover:bg-foreground/[0.025]">
                      <td className="py-2.5 pr-4 font-medium">{MODEL_OPTIONS.find((m) => m.key === key)?.label || key}</td>
                      <td className={`py-2.5 px-4 text-right ${next >= 0 ? 'text-positive' : 'text-negative'}`}>
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
                          <span className={trend > 0 ? 'text-positive' : trend < 0 ? 'text-negative' : 'text-muted-foreground'}>
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
      </>)}

      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Compare life scenarios side by side</p>
            <div className="flex gap-2">
              {compareIds.length >= 2 && (
                <Button size="sm" variant="outline" onClick={handleCompare}>
                  <GitCompare className="h-4 w-4 mr-1" /> Compare ({compareIds.length})
                </Button>
              )}
              <Button size="sm" onClick={() => setShowScenarioForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Scenario
              </Button>
            </div>
          </div>

          {compareData.length >= 2 && (
            <Card>
              <CardHeader><CardTitle>Scenario Comparison</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-foreground/5">
                        <th className="text-left py-2 pr-4 text-muted-foreground">Metric</th>
                        {compareData.map((s) => <th key={s.id} className="text-right py-2 px-4 text-muted-foreground">{s.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {['projectedBalance', 'monthlyNetFlow', 'emergencyFundImpact', 'savingsRateChange'].map((key) => (
                        <tr key={key} className="border-b border-foreground/[0.02]">
                          <td className="py-2 pr-4 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                          {compareData.map((s) => (
                            <td key={s.id} className="py-2 px-4 text-right">{formatCurrency((s.result[key] as number) || 0, currency)}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-b border-foreground/[0.02]">
                        <td className="py-2 pr-4 font-medium">Goal Delays</td>
                        {compareData.map((s) => (
                          <td key={s.id} className="py-2 px-4 text-right">
                            {((s.result.goalDelays as Array<{ name: string; delayDays: number }>) || []).map((g) => `${g.name}: ${g.delayDays}d`).join(', ') || 'None'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Recommendation</td>
                        {compareData.map((s) => (
                          <td key={s.id} className="py-2 px-4 text-right text-muted-foreground max-w-[200px]">{s.result.recommendation as string}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {scenarios.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={GitCompare} title="No scenarios yet" description="Create scenarios to compare life decisions" />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarios.map((s) => {
                const result = s.result as Record<string, unknown>;
                return (
                  <Card key={s.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-sm">{s.name}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{(s.scenarioType as string).replace(/_/g, ' ')}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={compareIds.includes(s.id)}
                            onChange={(e) => setCompareIds(e.target.checked ? [...compareIds, s.id] : compareIds.filter((id) => id !== s.id))}
                            className="rounded border-foreground/20"
                          />
                          <button onClick={() => handleDeleteScenario(s.id)} className="text-negative hover:text-negative p-0.5"><X className="h-3 w-3" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Projected Balance</p>
                          <p className={`font-medium ${(result.projectedBalance as number) >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {formatCurrency(result.projectedBalance as number, currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Monthly Net</p>
                          <p className={`font-medium ${(result.monthlyNetFlow as number) >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {formatCurrency(result.monthlyNetFlow as number, currency)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{result.recommendation as string}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {showScenarioForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md" onClick={() => setShowScenarioForm(false)}>
              <Card role="dialog" aria-modal="true" aria-label="New Scenario" className="mx-4 w-full max-w-md animate-in fade-in-0 zoom-in-95 bg-popover shadow-float" onClick={(e) => e.stopPropagation()}>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-lg">New Scenario</CardTitle>
                  <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setShowScenarioForm(false)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                    <input value={scenarioForm.name} onChange={(e) => setScenarioForm({ ...scenarioForm, name: e.target.value })} placeholder="e.g., Buy a house" className="h-9 w-full px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                    <select value={scenarioForm.scenarioType} onChange={(e) => setScenarioForm({ ...scenarioForm, scenarioType: e.target.value })} className="h-9 w-full px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15">
                      <option value="purchase">Purchase</option>
                      <option value="income_change">Income Change</option>
                      <option value="expense_change">Expense Change</option>
                      <option value="home_purchase">Home Purchase</option>
                      <option value="rent_increase">Rent Increase</option>
                      <option value="career_break">Career Break</option>
                      <option value="retirement">Retirement Planning</option>
                      <option value="new_job">New Job</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Parameters (JSON)</label>
                    <textarea value={scenarioForm.input} onChange={(e) => setScenarioForm({ ...scenarioForm, input: e.target.value })} rows={3} placeholder='{"amount": 1200}' className="w-full px-3 py-2 font-mono rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15" />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {scenarioForm.scenarioType === 'home_purchase' && 'Use: {"downPayment": 50000, "monthlyMortgage": 1500}'}
                      {scenarioForm.scenarioType === 'rent_increase' && 'Use: {"increasePercent": 15}'}
                      {scenarioForm.scenarioType === 'retirement' && 'Use: {"yearsToRetire": 10, "monthlyRetirementIncome": 3000}'}
                      {scenarioForm.scenarioType === 'purchase' && 'Use: {"amount": 1200}'}
                      {scenarioForm.scenarioType === 'income_change' && 'Use: {"changePercent": 20}'}
                      {scenarioForm.scenarioType === 'career_break' && 'Use: {"months": 3}'}
                      {scenarioForm.scenarioType === 'new_job' && 'Use: {"annualSalary": 85000}'}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowScenarioForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleCreateScenario} disabled={!scenarioForm.name || creatingScenario}>
                      {creatingScenario ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      Create
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'net-worth' && (
        <div className="space-y-4">
          {!netWorthProj ? (
            <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} lines={0} className="h-[88px]" />)}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard label="Current Net Worth" value={netWorthProj.currentNetWorth} icon={BarChart3} tone="info" valueTone={netWorthProj.currentNetWorth >= 0 ? 'positive' : 'negative'} currency={currency} />
                <MetricCard label="Monthly Net Flow" value={netWorthProj.monthlyNetFlow} icon={netWorthProj.monthlyNetFlow >= 0 ? TrendingUp : TrendingDown} tone={netWorthProj.monthlyNetFlow >= 0 ? 'positive' : 'negative'} valueTone={netWorthProj.monthlyNetFlow >= 0 ? 'positive' : 'negative'} currency={currency} />
                <MetricCard label="24-Month Projection" value={netWorthProj.projections[23]?.netWorth || 0} icon={TrendingUp} tone="accent" valueTone={(netWorthProj.projections[23]?.netWorth || 0) >= 0 ? 'positive' : 'negative'} currency={currency} />
              </div>

              <Card>
                <CardHeader><CardTitle>Net Worth Projection — 24 Months</CardTitle><CardDescription>Your current position carried forward at today&apos;s monthly net flow</CardDescription></CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <Line
                      data={{
                        labels: netWorthProj.projections.map((p) => p.month),
                        datasets: [{
                          label: 'Projected net worth',
                          data: netWorthProj.projections.map((p) => p.netWorth),
                          borderColor: chart.primary,
                          backgroundColor: areaFill('primary'),
                          fill: true,
                          tension: 0.35,
                          pointRadius: 0,
                          pointHoverRadius: 5,
                          pointHoverBorderColor: chart.surface,
                          pointHoverBorderWidth: 2,
                          borderWidth: 2,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: chart.tooltip },
                        interaction: { intersect: false, mode: 'index' },
                        scales: chart.axes,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
      </TransitionPanel>
    </div>
  );
}
