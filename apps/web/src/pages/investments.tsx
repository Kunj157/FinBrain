import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, PieChart, Plus, Wallet,
  ArrowUpRight, ArrowDownRight, Briefcase, X, RefreshCw, ArrowLeft,
} from 'lucide-react';
import { ExplainViewButton } from '@/components/finance/explain-view-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricTile } from '@/components/finance/metric-tile';
import { InView } from '@/components/motion/in-view';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type Holding = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number | null;
  currency: string;
  assetType: string;
};

type Portfolio = {
  id: string;
  name: string;
  description: string | null;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPct: number;
  holdingCount: number;
  holdings: Holding[];
};

type PortfolioDetail = Portfolio & {
  allocation: Array<{
    symbol: string;
    name: string;
    value: number;
    percentage: number;
    gainLoss: number;
    assetType: string;
  }>;
};

type Summary = {
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPct: number;
  portfolioCount: number;
  holdingCount: number;
  allocation: Array<{ type: string; value: number; percentage: number }>;
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  // Asset classes are identities, not states: categorical chart slots.
  stock: 'bg-chart-4',
  etf: 'bg-chart-1',
  bond: 'bg-chart-5',
  mutual_fund: 'bg-chart-2',
  crypto: 'bg-chart-3',
  other: 'bg-muted-foreground',
};

export default function Investments() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as string;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    name: '',
    quantity: '',
    avgCostBasis: '',
    currentPrice: '',
    assetType: 'stock',
  });
  const [topMovers, setTopMovers] = useState<{ gainers: Array<{ symbol: string; name: string; gainLossPercent: number; dailyChangePercent: number }>; losers: Array<{ symbol: string; name: string; gainLossPercent: number; dailyChangePercent: number }> }>({ gainers: [], losers: [] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, portfoliosRes] = await Promise.all([
        api.get('/investments/summary'),
        api.get('/investments/portfolios'),
      ]);
      setSummary(summaryRes.data.data);
      setPortfolios(portfoliosRes.data.data);
      api.get('/investments/top-movers').then((r) => setTopMovers(r.data.data)).catch(() => {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchPortfolioDetail = async (id: string) => {
    const res = await api.get(`/investments/portfolios/${id}`);
    setSelectedPortfolio(res.data.data);
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    await api.post('/investments/portfolios', { name: newPortfolioName.trim() });
    setNewPortfolioName('');
    setShowNewPortfolio(false);
    fetchData();
  };

  const handleAddHolding = async () => {
    if (!newHolding.symbol || !newHolding.name || !newHolding.quantity || !newHolding.avgCostBasis || !selectedPortfolio) return;
    await api.post('/investments/holdings', {
      portfolioId: selectedPortfolio.id,
      symbol: newHolding.symbol.toUpperCase(),
      name: newHolding.name,
      quantity: parseFloat(newHolding.quantity),
      avgCostBasis: parseFloat(newHolding.avgCostBasis),
      currentPrice: newHolding.currentPrice ? parseFloat(newHolding.currentPrice) : undefined,
      assetType: newHolding.assetType,
      currency: user?.currency || 'USD',
    });
    setNewHolding({ symbol: '', name: '', quantity: '', avgCostBasis: '', currentPrice: '', assetType: 'stock' });
    setShowAddHolding(false);
    fetchPortfolioDetail(selectedPortfolio.id);
    fetchData();
  };

  const handleDeleteHolding = async (holdingId: string) => {
    await api.delete(`/investments/holdings/${holdingId}`);
    if (selectedPortfolio) fetchPortfolioDetail(selectedPortfolio.id);
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading investments">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} lines={0} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} lines={3} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Briefcase}
        title="Investments"
        description="Track your portfolio performance"
        actions={<>
          <ExplainViewButton viewName="Investments" />
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={async () => {
              try {
                await api.post('/investments/holdings/refresh-prices');
                fetchData();
              } catch {
                // silent
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Prices
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowNewPortfolio(true)}>
            <Plus className="h-4 w-4" />
            New Portfolio
          </Button>
        </>}
      />

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile icon={Wallet} label="Total Value" value={summary.totalValue} format={(n) => formatCurrency(n, currency)} tone="primary" />
          <MetricTile icon={Briefcase} label="Total Cost" value={summary.totalCost} format={(n) => formatCurrency(n, currency)} />
          <MetricTile
            icon={summary.gainLoss >= 0 ? TrendingUp : TrendingDown}
            label="Gain/Loss"
            value={summary.gainLoss}
            format={(n) => `${n >= 0 ? '+' : '-'}${formatCurrency(Math.abs(n), currency)}`}
            tone={summary.gainLoss >= 0 ? 'positive' : 'negative'}
            valueClassName={summary.gainLoss >= 0 ? 'text-positive' : 'text-negative'}
            hint={`${summary.gainLossPct >= 0 ? '+' : ''}${summary.gainLossPct}% all time`}
          />
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
                <PieChart className="h-4 w-4" aria-hidden />
              </span>
              <p className="stat-label">Asset Allocation</p>
            </div>
            {/* One stacked bar; a 2px surface gap separates the segments. */}
            <div className="mt-4 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-muted" role="img" aria-label={summary.allocation.map((a) => `${a.type} ${a.percentage}%`).join(', ')}>
              {summary.allocation.map((a) => (
                <div
                  key={a.type}
                  className={`h-full first:rounded-l-full last:rounded-r-full ${ASSET_TYPE_COLORS[a.type] || 'bg-muted-foreground'}`}
                  style={{ width: `${Math.max(a.percentage, 4)}%` }}
                  title={`${a.type}: ${a.percentage}%`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {summary.allocation.map((a) => (
                <span key={a.type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${ASSET_TYPE_COLORS[a.type] || 'bg-muted-foreground'}`} />
                  <span className="capitalize">{a.type.replace('_', ' ')}</span>
                  <span className="tabular-nums text-foreground">{a.percentage}%</span>
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {selectedPortfolio ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedPortfolio(null)} aria-label="Back to portfolios" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {selectedPortfolio.name}
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowAddHolding(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Holding
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedPortfolio.holdings.length === 0 ? (
              <EmptyState icon={Briefcase} title="No holdings yet" description="Add your first investment to start tracking" />
            ) : (
              <div className="-mx-2 divide-y divide-border/60">
                {selectedPortfolio.holdings.map((h) => {
                  const value = h.quantity * (h.currentPrice || h.avgCostBasis);
                  const cost = h.quantity * h.avgCostBasis;
                  const gl = value - cost;
                  const glPct = cost > 0 ? (gl / cost) * 100 : 0;

                  return (
                    <div key={h.id} className="flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-foreground/[0.025]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 ring-1 ring-inset ring-border">
                          <span className="font-mono text-[11px] font-semibold">{h.symbol.slice(0, 3)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{h.symbol}</p>
                          <p className="text-xs text-muted-foreground">{h.name} · {h.quantity} shares</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{formatCurrency(value, currency)}</p>
                          <p className={`text-xs ${gl >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {gl >= 0 ? '+' : ''}{formatCurrency(gl, currency)} ({glPct >= 0 ? '+' : ''}{glPct.toFixed(1)}%)
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteHolding(h.id)}
                          aria-label={`Remove ${h.symbol}`}
                          className="p-1.5 rounded-lg hover:bg-negative/10 text-muted-foreground hover:text-negative transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((p, i) => (
            <InView key={p.id} index={i}>
            <Card
              className="card-hover cursor-pointer"
              onClick={() => fetchPortfolioDetail(p.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fetchPortfolioDetail(p.id); } }}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold tracking-tight">{p.name}</h3>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.05] ring-1 ring-inset ring-border"><Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden /></span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Value</span>
                    <span className="text-lg font-semibold tabular-nums tracking-tight">{formatCurrency(p.totalValue, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gain/Loss</span>
                    <span className={`text-sm font-medium flex items-center gap-1 ${p.gainLoss >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {p.gainLoss >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {formatCurrency(Math.abs(p.gainLoss), currency)} ({p.gainLossPct >= 0 ? '+' : ''}{p.gainLossPct}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Holdings</span>
                    <span className="text-xs">{p.holdingCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            </InView>
          ))}
          {portfolios.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <EmptyState
                icon={Briefcase}
                title="No portfolios yet"
                description="Group your holdings into portfolios to see value and gains at a glance."
                action={
                  <Button size="sm" onClick={() => setShowNewPortfolio(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Portfolio
                  </Button>
                }
              />
            </Card>
          )}
        </div>
      )}

      {(topMovers.gainers.length > 0 || topMovers.losers.length > 0) && !selectedPortfolio && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-positive" /> Top Gainers</CardTitle></CardHeader>
            <CardContent>
              {topMovers.gainers.map((g) => (
                <div key={g.symbol} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{g.symbol}</p>
                    <p className="text-xs text-muted-foreground">{g.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-positive">+{g.gainLossPercent}%</p>
                    <p className="text-xs text-muted-foreground">Today: {g.dailyChangePercent >= 0 ? '+' : ''}{g.dailyChangePercent}%</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingDown className="h-4 w-4 text-negative" /> Top Losers</CardTitle></CardHeader>
            <CardContent>
              {topMovers.losers.map((l) => (
                <div key={l.symbol} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{l.symbol}</p>
                    <p className="text-xs text-muted-foreground">{l.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-negative">{l.gainLossPercent}%</p>
                    <p className="text-xs text-muted-foreground">Today: {l.dailyChangePercent >= 0 ? '+' : ''}{l.dailyChangePercent}%</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {showNewPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md" onClick={() => setShowNewPortfolio(false)}>
          <div className="mx-4 w-full max-w-md animate-in fade-in-0 zoom-in-95 rounded-2xl border bg-popover shadow-float duration-200 [background-image:var(--sheen)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-foreground/[0.06]">
              <h2 className="text-lg font-semibold">New Portfolio</h2>
              <button onClick={() => setShowNewPortfolio(false)} className="p-1.5 rounded-lg hover:bg-foreground/[0.04]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Portfolio Name</label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="e.g., My Investments"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewPortfolio(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreatePortfolio} disabled={!newPortfolioName.trim()}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddHolding && selectedPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md" onClick={() => setShowAddHolding(false)}>
          <div className="mx-4 w-full max-w-md animate-in fade-in-0 zoom-in-95 rounded-2xl border bg-popover shadow-float duration-200 [background-image:var(--sheen)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-foreground/[0.06]">
              <h2 className="text-lg font-semibold">Add Holding</h2>
              <button onClick={() => setShowAddHolding(false)} className="p-1.5 rounded-lg hover:bg-foreground/[0.04]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Symbol</label>
                  <input
                    type="text"
                    value={newHolding.symbol}
                    onChange={(e) => setNewHolding({ ...newHolding, symbol: e.target.value.toUpperCase() })}
                    placeholder="AAPL"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                  <input
                    type="text"
                    value={newHolding.name}
                    onChange={(e) => setNewHolding({ ...newHolding, name: e.target.value })}
                    placeholder="Apple Inc."
                    className="w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                  <input
                    type="number"
                    value={newHolding.quantity}
                    onChange={(e) => setNewHolding({ ...newHolding, quantity: e.target.value })}
                    placeholder="10"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Avg Cost</label>
                  <input
                    type="number"
                    value={newHolding.avgCostBasis}
                    onChange={(e) => setNewHolding({ ...newHolding, avgCostBasis: e.target.value })}
                    placeholder="150.00"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Current Price</label>
                  <input
                    type="number"
                    value={newHolding.currentPrice}
                    onChange={(e) => setNewHolding({ ...newHolding, currentPrice: e.target.value })}
                    placeholder="175.00"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Asset Type</label>
                <select
                  value={newHolding.assetType}
                  onChange={(e) => setNewHolding({ ...newHolding, assetType: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-surface-sunken/60 text-sm transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                >
                  <option value="stock">Stock</option>
                  <option value="etf">ETF</option>
                  <option value="bond">Bond</option>
                  <option value="mutual_fund">Mutual Fund</option>
                  <option value="crypto">Crypto</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddHolding(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddHolding} disabled={!newHolding.symbol || !newHolding.name || !newHolding.quantity || !newHolding.avgCostBasis}>
                  Add Holding
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
