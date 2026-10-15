import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowRightLeft, Target, Brain, Sparkles, Loader2, Plus, X, Send, Shield, Eye, Upload, Lock, Settings, Check, ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/finance/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadError } from '@/components/ui/load-error';
import { PlaidLinkButton } from '@/components/finance/plaid-link';
import { CsvImport } from '@/components/finance/csv-import';
import { WeeklyRecap } from '@/components/finance/weekly-recap';
import { DataQualityWidget } from '@/components/finance/data-quality-widget';
import { SpendingMixCard } from '@/components/finance/spending-mix-card';
import {
  SortableWidget,
  DashboardGrid,
  loadDashboardLayout,
  saveDashboardLayout,
  type WidgetId,
} from '@/components/finance/dashboard-widgets';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { fetchAllTransactions } from '@/lib/transactions';
import { useAdvisorChat } from '@/hooks/use-advisor-chat';
import { ChatBubble } from '@/components/advisor/chat-bubble';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IncomeExpenseChart, CategoryChart, SpendingTrend } from '@/components/finance/charts';
import { InView } from '@/components/motion/in-view';
import { BorderTrail } from '@/components/motion/border-trail';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
import type { Transaction, Category } from '@finbrain/shared';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [netWorth, setNetWorth] = useState<{ netWorth: number } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Shared with the advisor page: streaming, markdown, conversation memory and
  // the affordability tool, instead of the older buffered endpoint this panel
  // used to call.
  const { messages: chatMessages, isLoading: isChatLoading, send: sendChat, retry: retryChat } = useAdvisorChat();
  const [onboardingAction, setOnboardingAction] = useState<string | null>(null);
  const [advisorInsights, setAdvisorInsights] = useState<Array<{ id: string; type: string; title: string; summary: string; severity: string; actions: string[] }>>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dashboard layout state
  const [widgetLayout, setWidgetLayout] = useState<WidgetId[]>(() => loadDashboardLayout());
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Every headline figure below — net cash flow, monthly income and
      // expenses, total savings — is derived from this list. Fetching only the
      // most recent hundred silently understated all of them for anyone with a
      // longer history, with nothing in the UI to say the view was truncated.
      const [txns, catRes, nwRes] = await Promise.all([
        fetchAllTransactions('', user?.currency || 'USD'),
        api.get('/categories'),
        api.get('/accounts/net-worth').catch(() => null),
      ]);
      setAllTransactions(txns);
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
  }, [user?.currency]);

  useEffect(() => {
    fetchData();
    const onVisible = () => { if (!document.hidden) fetchData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchData]);

  const handleChatSend = () => {
    if (!chatInput.trim() || isChatLoading) return;
    const question = chatInput.trim();
    setChatInput('');
    void sendChat(question);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [chatMessages]);

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
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-72" /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} lines={0} className="h-[150px]" />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <CardSkeleton className="h-80 lg:col-span-2" /><CardSkeleton className="h-80" />
        </div>
      </div>
    );
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
      case 'spending-mix':
        return <SpendingMixCard transactions={allTransactions} categories={categories} currency={currency} />;
      case 'quick-actions':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Create Budget', hint: 'Set a monthly limit for a category', icon: PiggyBank, tone: 'bg-warning/10 text-warning ring-warning/20', to: '/budgets' },
              { label: 'Add Goal', hint: 'Save toward something that matters', icon: Target, tone: 'bg-accent/10 text-accent ring-accent/20', to: '/goals' },
            ].map((action) => (
              <button key={action.label} onClick={() => navigate(action.to)}
                className="group flex items-center gap-4 rounded-xl border bg-card/60 p-4 text-left shadow-edge transition-[border-color,background-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:bg-card">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ${action.tone}`}>
                  <action.icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{action.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{action.hint}</span>
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-background/60 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                  <Plus className="h-4 w-4" aria-hidden />
                </span>
              </button>
            ))}
          </div>
        );
      case 'income-expense':
        return (
          <Card className="h-full"><CardHeader><CardTitle>Income vs Expenses</CardTitle><CardDescription>Last six months</CardDescription></CardHeader>
            <CardContent><div className="h-64"><IncomeExpenseChart transactions={allTransactions} /></div></CardContent>
          </Card>
        );
      case 'category-breakdown':
        return (
          <Card className="h-full"><CardHeader><CardTitle>Spending by Category</CardTitle><CardDescription>Where your money went</CardDescription></CardHeader>
            <CardContent><div className="h-72 flex items-center justify-center"><div className="h-full w-full max-w-[300px] overflow-hidden"><CategoryChart transactions={allTransactions} categories={categories} /></div></div></CardContent>
          </Card>
        );
      case 'spending-trend':
        return (
          <Card className="h-full"><CardHeader><CardTitle>Spending Trend</CardTitle><CardDescription>Daily spending over the last 30 days</CardDescription></CardHeader>
            <CardContent><div className="h-56"><SpendingTrend transactions={allTransactions} /></div></CardContent>
          </Card>
        );
      case 'recent-transactions':
        return (
          <Card className="h-full">
            <CardHeader><div className="flex items-center justify-between"><CardTitle>Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/transactions')}>View all<ChevronRight className="h-3.5 w-3.5" /></Button>
            </div></CardHeader>
            <CardContent>
              {allTransactions.length === 0 ? (
                <EmptyState icon={ArrowRightLeft} title="No transactions yet" description="Import a statement or add one by hand." className="py-6" />
              ) : (
                <div className="-mx-2 max-h-[340px] divide-y divide-border/60 overflow-y-auto">
                  {allTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-foreground/[0.025]">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${tx.type === 'income' ? 'bg-positive/10 ring-positive/20' : 'bg-foreground/[0.04] ring-border'}`}>
                          {tx.type === 'income'
                            ? <ArrowDownLeft className="h-4 w-4 text-positive" aria-hidden />
                            : <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{tx.merchant || tx.description}</p>
                          <p className="truncate text-xs text-muted-foreground">{categoryMap[tx.categoryId] || 'Other'} · {formatDate(tx.date)}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-semibold tabular-nums ${tx.type === 'income' ? 'text-positive' : 'text-foreground'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </p>
                        <Badge variant={tx.status === 'pending' ? 'warning' : 'secondary'} className="mt-0.5 px-1.5 py-0 text-[10px]">{tx.status}</Badge>
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
          <Card className="h-full">
            <CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" aria-hidden />AI Insights</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate('/insights')}>
                View all<ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div></CardHeader>
            <CardContent className="space-y-3">
              {insightsLoading ? (
                <div className="space-y-2 py-1"><TextShimmer as="p" className="text-xs">Reading your recent activity…</TextShimmer><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></div>
              ) : advisorInsights.length > 0 ? (
                advisorInsights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className={`rounded-xl p-3 border ${
                    insight.severity === 'critical' ? 'bg-negative/5 border-negative/10' :
                    insight.severity === 'warning' ? 'bg-warning/5 border-warning/10' :
                    insight.severity === 'positive' ? 'bg-positive/5 border-positive/10' :
                    'bg-info/5 border-info/10'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Sparkles className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                        insight.severity === 'critical' ? 'text-negative' :
                        insight.severity === 'warning' ? 'text-warning' :
                        insight.severity === 'positive' ? 'text-positive' : 'text-info'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{insight.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{insight.summary}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={Brain} title="No insights yet" description="They appear as your history grows." className="py-6" />
              )}
            </CardContent>
          </Card>
        );
      case 'ask-finbrain':
        return (
          <Card className="h-full">
            {isChatLoading && <BorderTrail tone="accent" />}
            <CardHeader className="pb-1"><CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" aria-hidden />Ask FinBrain
            </CardTitle><CardDescription>Questions answered from your own numbers</CardDescription></CardHeader>
            <CardContent>
              {chatMessages.length > 0 && (
                <div className="max-h-[280px] overflow-y-auto space-y-3 mb-3 scrollbar-thin">
                  {chatMessages.map((msg, i) => (
                    <ChatBubble key={i} message={msg} onRetry={retryChat} />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown}
                  placeholder="Ask anything..." aria-label="Ask FinBrain" className="h-10 flex-1 rounded-lg border border-input bg-surface-sunken/60 px-3 text-sm text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15" disabled={isChatLoading} />
                <Button size="icon" variant="accent" className="h-10 w-10" aria-label="Send" onClick={handleChatSend} disabled={!chatInput.trim() || isChatLoading}>
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Brain className="h-8 w-8 text-primary" />
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
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:border-foreground/[0.12] px-6 py-3 text-sm font-medium text-muted-foreground transition-all duration-200">
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">{greeting()}, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s where your money stands today.</p>
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
        {widgetLayout.map((widgetId, index) => (
          <SortableWidget key={widgetId} id={widgetId} isEditing={isEditingLayout}>
            <InView index={index} className="h-full">{renderWidget(widgetId)}</InView>
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
            <div className="flex items-center justify-between p-6 border-b border-foreground/[0.06]">
              <div><h2 className="text-lg font-semibold">Upload Statement</h2><p className="text-xs text-muted-foreground mt-1">Import a CSV or PDF bank statement</p></div>
              <button onClick={() => setOnboardingAction(null)} className="p-2 rounded-lg hover:bg-foreground/[0.04] transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6"><CsvImport onComplete={() => { setOnboardingAction(null); fetchData(); }} /></div>
          </div>
        </div>
      )}
    </>
  );
}
