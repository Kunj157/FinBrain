import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, PieChart, Plus, Loader2, Wallet,
  ArrowUpRight, ArrowDownRight, Briefcase, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  stock: 'bg-blue-500',
  etf: 'bg-emerald-500',
  bond: 'bg-amber-500',
  mutual_fund: 'bg-purple-500',
  crypto: 'bg-rose-500',
  other: 'bg-gray-500',
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, portfoliosRes] = await Promise.all([
        api.get('/investments/summary'),
        api.get('/investments/portfolios'),
      ]);
      setSummary(summaryRes.data.data);
      setPortfolios(portfoliosRes.data.data);
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
          <p className="text-sm text-muted-foreground">Track your portfolio performance</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowNewPortfolio(true)}>
          <Plus className="h-4 w-4" />
          New Portfolio
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.totalValue, currency)}</p>
                </div>
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.totalCost, currency)}</p>
                </div>
                <Briefcase className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Gain/Loss</p>
                  <p className={`text-xl font-bold flex items-center gap-1 ${summary.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.gainLoss >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {formatCurrency(Math.abs(summary.gainLoss), currency)}
                  </p>
                </div>
                {summary.gainLoss >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-400" />
                )}
              </div>
              <p className={`text-xs mt-1 ${summary.gainLossPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {summary.gainLossPct >= 0 ? '+' : ''}{summary.gainLossPct}%
              </p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Asset Allocation</p>
                  <div className="flex gap-1 mt-2">
                    {summary.allocation.map((a) => (
                      <div
                        key={a.type}
                        className={`h-2 rounded-full ${ASSET_TYPE_COLORS[a.type] || 'bg-gray-500'}`}
                        style={{ width: `${Math.max(a.percentage, 4)}%` }}
                        title={`${a.type}: ${a.percentage}%`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {summary.allocation.map((a) => (
                      <span key={a.type} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${ASSET_TYPE_COLORS[a.type] || 'bg-gray-500'}`} />
                        {a.type} {a.percentage}%
                      </span>
                    ))}
                  </div>
                </div>
                <PieChart className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedPortfolio ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedPortfolio(null)} className="p-1">
                  ←
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
              <div className="text-center py-8">
                <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No holdings yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add your first investment to start tracking</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedPortfolio.holdings.map((h) => {
                  const value = h.quantity * (h.currentPrice || h.avgCostBasis);
                  const cost = h.quantity * h.avgCostBasis;
                  const gl = value - cost;
                  const glPct = cost > 0 ? (gl / cost) * 100 : 0;

                  return (
                    <div key={h.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
                          <span className="text-xs font-bold">{h.symbol.slice(0, 3)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{h.symbol}</p>
                          <p className="text-xs text-muted-foreground">{h.name} · {h.quantity} shares</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(value, currency)}</p>
                          <p className={`text-xs ${gl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {gl >= 0 ? '+' : ''}{formatCurrency(gl, currency)} ({glPct >= 0 ? '+' : ''}{glPct.toFixed(1)}%)
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteHolding(h.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
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
          {portfolios.map((p) => (
            <Card
              key={p.id}
              className="stat-card cursor-pointer hover:border-emerald-500/20 transition-colors"
              onClick={() => fetchPortfolioDetail(p.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{p.name}</h3>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Value</span>
                    <span className="text-sm font-bold">{formatCurrency(p.totalValue, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gain/Loss</span>
                    <span className={`text-sm font-medium flex items-center gap-1 ${p.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
          ))}
          {portfolios.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="p-12 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">No portfolios yet</p>
                <Button size="sm" onClick={() => setShowNewPortfolio(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Portfolio
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showNewPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowNewPortfolio(false)}>
          <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold">New Portfolio</h2>
              <button onClick={() => setShowNewPortfolio(false)} className="p-1.5 rounded-lg hover:bg-white/[0.04]">
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
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddHolding(false)}>
          <div className="w-full max-w-md mx-4 glass rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold">Add Holding</h2>
              <button onClick={() => setShowAddHolding(false)} className="p-1.5 rounded-lg hover:bg-white/[0.04]">
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
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                  <input
                    type="text"
                    value={newHolding.name}
                    onChange={(e) => setNewHolding({ ...newHolding, name: e.target.value })}
                    placeholder="Apple Inc."
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Avg Cost</label>
                  <input
                    type="number"
                    value={newHolding.avgCostBasis}
                    onChange={(e) => setNewHolding({ ...newHolding, avgCostBasis: e.target.value })}
                    placeholder="150.00"
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Current Price</label>
                  <input
                    type="number"
                    value={newHolding.currentPrice}
                    onChange={(e) => setNewHolding({ ...newHolding, currentPrice: e.target.value })}
                    placeholder="175.00"
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Asset Type</label>
                <select
                  value={newHolding.assetType}
                  onChange={(e) => setNewHolding({ ...newHolding, assetType: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
