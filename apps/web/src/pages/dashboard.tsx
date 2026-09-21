import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowRightLeft, Target, Brain, Sparkles, Loader2, Plus, X, Send, Shield, Eye, Upload, Lock, Settings, Check } from 'lucide-react';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/finance/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadError } from '@/components/ui/load-error';
import { PlaidLinkButton } from '@/components/finance/plaid-link';
import { CsvImport } from '@/components/finance/csv-import';
import { WeeklyRecap } from '@/components/finance/weekly-recap';
import { DataQualityWidget } from '@/components/finance/data-quality-widget';
import {
  SortableWidget,
  DashboardGrid,
  loadDashboardLayout,
  saveDashboardLayout,
  type WidgetId,
} from '@/components/finance/dashboard-widgets';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { sendChatMessage } from '@/lib/ai-chat';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IncomeExpenseChart, CategoryChart, SpendingTrend } from '@/components/finance/charts';
import type { Transaction, Category } from '@finbrain/shared';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [netWorth, setNetWorth] = useState<{ netWorth: number } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [onboardingAction, setOnboardingAction] = useState<string | null>(null);
  const [advisorInsights, setAdvisorInsights] = useState<Array<{ id: string; type: string; title: string; summary: string; severity: string; actions: string[] }>>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dashboard layout state
  const [widgetLayout, setWidgetLayout] = useState<WidgetId[]>(() => loadDashboardLayout());
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [txnRes, catRes, nwRes] = await Promise.all([
        api.get('/transactions?limit=100'),
        api.get('/categories'),
        api.get('/accounts/net-worth').catch(() => null),
      ]);
      setAllTransactions(txnRes.data.data.data);
      setCategories(catRes.data.data);
      setLoadError(null);

      // Net worth is only meaningful once real accounts are linked. It is
      // deliberately NOT derived from transactions: income minus expenses is
      // cash flow, not net worth, and presenting it under that label
      // contradicts the accounts page.
      setNetWorth(nwRes?.data?.data?.accounts?.length ? nwRes.data.data : null);

      setInsightsLoading(true);
      api.get('/advisor/insights').then((res) => {
        setAdvisorInsights(res.data.data || []);
      }).catch(() => {}).finally(() => setInsightsLoading(false));
    } catch (error) {
      console.error('Dashboard load failed:', error);
      setLoadError('We could not load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const onVisible = () => { if (!document.hidden) fetchData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchData]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsChatLoading(true);
    try {
      const answer = await sendChatMessage(question, chatMessages);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (err as Error)?.message
        || 'An error occurred.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleLayoutSave = () => { saveDashboardLayout(widgetLayout); setIsEditingLayout(false); };

  const summary = useMemo(() => {
    if (allTransactions.length === 0) {
      return { currentBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, savings: 0, currency: user?.currency || 'USD', incomeChange: 0, expenseChange: 0 };
    }
    const sortedDates = allTransactions.map((t) => new Date(t.date).getTime()).sort((a, b) => b - a);
    const latestDate = new Date(sortedDates[0]);
    const monthStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
    const lastMonthStart = new Date(latestDate.getFullYear(), latestDate.getMonth() - 1, 1);
    const monthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0, 23, 59, 59);
    const monthly = allTransactions.filter((t) => { const d = new Date(t.date); return d >= monthStart && d <= monthEnd; });
    const lastMonth = allTransactions.filter((t) => { const d = new Date(t.date); return d >= lastMonthStart && d < monthStart; });
    const income = monthly.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = monthly.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    const lastMonthIncome = lastMonth.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const lastMonthExpenses = lastMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    const allIncome = allTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const allExpenses = allTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    return {
      currentBalance: allIncome - allExpenses,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      savings: income - expenses,
      currency: (user?.currency || 'USD') as string,
      incomeChange: lastMonthIncome > 0 ? Math.round(((income - lastMonthIncome) / lastMonthIncome) * 100) : 0,
      expenseChange: lastMonthExpenses > 0 ? Math.round(((expenses - lastMonthExpenses) / lastMonthExpenses) * 100) : 0,
    };
  }, [allTransactions, user?.currency]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [categories]);

  const currency = user?.currency || 'USD';
  const firstName = user?.name?.split(' ')[0] || 'there';

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 text-muted-foreground animate-spin" /></div>;
  }

  if (loadError) {
    return <LoadError message={loadError} onRetry={() => { setLoading(true); fetchData(); }} />;
  }

  const hasData = allTransactions.length > 0;

  // Widget renderers
  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'stat-cards':
        return (
          <div className={`grid gap-4 sm:grid-cols-2 ${netWorth ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
            {netWorth && <StatCard title="Net Worth" value={netWorth.netWorth} icon={Wallet} variant={netWorth.netWorth >= 0 ? 'positive' : 'negative'} currency={currency} />}
            <StatCard title="Net Cash Flow" value={summary.currentBalance} icon={Wallet} variant={summary.currentBalance >= 0 ? 'positive' : 'negative'} currency={currency} />
            <StatCard title="Monthly Income" value={summary.monthlyIncome} change={summary.incomeChange} icon={TrendingUp} variant="positive" currency={currency} />
            <StatCard title="Monthly Expenses" value={summary.monthlyExpenses} change={summary.expenseChange} icon={TrendingDown} variant="negative" currency={currency} lowerIsBetter />
            <StatCard title="Total Savings" value={summary.savings} icon={PiggyBank} variant={summary.savings >= 0 ? 'positive' : 'negative'} currency={currency} />
          </div>
        );
      case 'quick-actions':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[{ label: 'Create Budget', icon: PiggyBank, variant: 'warning' as const }, { label: 'Add Goal', icon: Target, variant: 'default' as const }].map((action) => (
              <button key={action.label} onClick={() => { if (action.label === 'Create Budget') navigate('/budgets'); else if (action.label === 'Add Goal') navigate('/goals'); }}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 group cursor-pointer">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.variant === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/[0.04] text-foreground'}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
                <Plus className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        );
      case 'income-expense':
        return (
          <Card><CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
            <CardContent><div className="h-64"><IncomeExpenseChart transactions={allTransactions} /></div></CardContent>
          </Card>
        );
      case 'category-breakdown':
        return (
          <Card><CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
            <CardContent><div className="h-64 flex items-center justify-center"><div className="w-full max-w-[280px] overflow-hidden"><CategoryChart transactions={allTransactions} categories={categories} /></div></div></CardContent>
          </Card>
        );
      case 'spending-trend':
        return (
          <Card><CardHeader><CardTitle>Spending Trend (30 days)</CardTitle></CardHeader>
            <CardContent><div className="h-48"><SpendingTrend transactions={allTransactions} /></div></CardContent>
          </Card>
        );
      case 'recent-transactions':
        return (
          <Card>
            <CardHeader><div className="flex items-center justify-between"><CardTitle>Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/transactions')}>View All<ArrowRightLeft className="h-3 w-3" /></Button>
            </div></CardHeader>
            <CardContent>
              {allTransactions.length === 0 ? (
                <div className="py-8 text-center"><p className="text-sm text-muted-foreground">No transactions yet</p></div>
              ) : (
                <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                  {allTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                          <ArrowRightLeft className={`h-4 w-4 ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.merchant || tx.description}</p>
                          <p className="text-xs text-muted-foreground">{categoryMap[tx.categoryId] || 'Other'} · {formatDate(tx.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${tx.type === 'income' ? 'text-emerald-400' : 'text-foreground'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </p>
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">{tx.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 'weekly-recap':
        return <WeeklyRecap />;
      case 'data-quality':
        return <DataQualityWidget />;
      case 'ai-insights':
        return (
          <Card>
            <CardHeader><div className="flex items-center justify-between"><CardTitle>AI Insights</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => navigate('/insights')}>
                <Sparkles className="h-3 w-3 text-emerald-400" />View all
              </Button>
            </div></CardHeader>
            <CardContent className="space-y-3">
              {insightsLoading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : advisorInsights.length > 0 ? (
                advisorInsights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className={`rounded-xl p-3 border ${
                    insight.severity === 'critical' ? 'bg-rose-500/5 border-rose-500/10' :
                    insight.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/10' :
                    insight.severity === 'positive' ? 'bg-emerald-500/5 border-emerald-500/10' :
                    'bg-blue-500/5 border-blue-500/10'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Sparkles className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                        insight.severity === 'critical' ? 'text-rose-400' :
                        insight.severity === 'warning' ? 'text-amber-400' :
                        insight.severity === 'positive' ? 'text-emerald-400' : 'text-blue-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{insight.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{insight.summary}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center"><Brain className="h-6 w-6 text-muted-foreground/30 mx-auto" /><p className="text-xs text-muted-foreground mt-2">No insights yet</p></div>
              )}
            </CardContent>
          </Card>
        );
      case 'ask-finbrain':
        return (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-400" />Ask FinBrain
            </CardTitle></CardHeader>
            <CardContent>
              {chatMessages.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto space-y-2 mb-3 scrollbar-thin">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {msg.role === 'assistant' && <div className="flex items-center gap-1 mb-0.5"><Brain className="h-2.5 w-2.5 text-emerald-400" /><span className="text-[9px] text-emerald-400">FinBrain</span></div>}
                      <p className={`rounded-lg px-2.5 py-1.5 ${msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-50 inline-block' : 'text-muted-foreground'}`}>{msg.content}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown}
                  placeholder="Ask anything..." className="flex-1 h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" disabled={isChatLoading} />
                <Button size="sm" onClick={handleChatSend} disabled={!chatInput.trim() || isChatLoading}>
                  {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  const emptyContent = (
    <div className="flex items-center justify-center min-h-[70vh] animate-fade-in">
      <div className="w-full max-w-lg mx-4 text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Brain className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to <span className="text-gradient">Fin</span>Brain</h1>
            <p className="text-muted-foreground mt-3 max-w-sm mx-auto text-sm leading-relaxed">
              Connect your accounts to see all your finances in one place. We&apos;ll automatically categorize and analyze your transactions.
            </p>
          </div>
        </div>
        <div className="space-y-3 max-w-xs mx-auto">
          <PlaidLinkButton userId={user?.id || 'anon'} onSuccess={fetchData} />
          <button onClick={() => setOnboardingAction('import-csv')}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] px-6 py-3 text-sm font-medium text-muted-foreground transition-all duration-200">
            <Upload className="h-4 w-4" />Upload a statement instead
          </button>
        </div>
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground/60">
          <div className="flex items-center gap-1.5"><Lock className="h-3 w-3" /><span>256-bit encrypted</span></div>
          <div className="flex items-center gap-1.5"><Eye className="h-3 w-3" /><span>Read-only access</span></div>
          <div className="flex items-center gap-1.5"><Shield className="h-3 w-3" /><span>Never stored</span></div>
        </div>
      </div>
    </div>
  );

  const normalContent = (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {firstName}. Here&apos;s your financial overview.</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditingLayout ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setWidgetLayout(loadDashboardLayout()); setIsEditingLayout(false); }}>Cancel</Button>
              <Button size="sm" onClick={handleLayoutSave} className="gap-1"><Check className="h-3 w-3" />Save Layout</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditingLayout(true)} className="gap-1"><Settings className="h-3 w-3" />Customize</Button>
              <Button className="gap-2" onClick={() => navigate('/transactions')}><Plus className="h-4 w-4" />Add Transaction</Button>
            </>
          )}
        </div>
      </div>

      <DashboardGrid widgets={widgetLayout} onReorder={setWidgetLayout} isEditing={isEditingLayout}>
        {widgetLayout.map((widgetId) => (
          <SortableWidget key={widgetId} id={widgetId} isEditing={isEditingLayout}>
            {renderWidget(widgetId)}
          </SortableWidget>
        ))}
      </DashboardGrid>
    </div>
  );

  return (
    <>
      {hasData ? normalContent : emptyContent}
      {onboardingAction === 'import-csv' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOnboardingAction(null)}>
          <div className="w-full max-w-lg mx-4 glass rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
              <div><h2 className="text-lg font-semibold">Upload Statement</h2><p className="text-xs text-muted-foreground mt-1">Import a CSV or PDF bank statement</p></div>
              <button onClick={() => setOnboardingAction(null)} className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6"><CsvImport onComplete={() => { setOnboardingAction(null); fetchData(); }} /></div>
          </div>
        </div>
      )}
    </>
  );
}
