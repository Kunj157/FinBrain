/**
 * In-browser stand-in for the API, used only by the static demo build
 * (VITE_DEMO=1). It answers the same routes with the same `{ success, data }`
 * envelope from the sample data in ./data, keeps edits in memory for the
 * visit, and never touches the network.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as d from './data';

// Sample rows are loosely typed: the UI defines the shapes, and this file mirrors them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
type Q = Record<string, string>;
type Req = { method: string; params: Record<string, string>; query: Q; body: Row };
type Handler = (req: Req) => unknown;

const ok = (data: unknown) => ({ success: true, data });
let seq = 1000;
const newId = (prefix: string) => `${prefix}-${++seq}`;
const now = () => new Date().toISOString();

const state = {
  transactions: structuredClone(d.transactions) as Row[],
  categories: structuredClone(d.categories) as Row[],
  budgets: structuredClone(d.budgets) as Row[],
  goals: structuredClone(d.goals) as Row[],
  accounts: structuredClone(d.accounts) as Row[],
  holdings: structuredClone(d.holdings) as Row[],
  creditScores: structuredClone(d.creditScores) as Row[],
  notifications: structuredClone(d.notifications) as Row[],
  conversations: [] as { id: string; title: string; createdAt: string; updatedAt: string; messages: Row[] }[],
  scenarios: [] as Row[],
  rules: [] as Row[],
};

const live = () => state.transactions.filter((t) => !t.deletedAt);
const catById = (id: string) => state.categories.find((c) => c.id === id);
const round = (n: number) => Math.round(n * 100) / 100;
const monthKey = (iso: string) => iso.slice(0, 7);

function spentFor(categoryId: string, startDate: string) {
  return round(live().filter((t) => t.type === 'expense' && t.categoryId === categoryId && t.date >= startDate)
    .reduce((s, t) => s + t.amount, 0));
}

function budgetView(b: Row) {
  const spent = spentFor(b.categoryId, b.startDate);
  return { ...b, spent, remaining: Math.max(round(b.amount - spent), 0) };
}

function goalView(g: Row) {
  const total = g.contributions.reduce((s: number, c: Row) => s + c.amount, 0);
  const current = g.currentAmount || total;
  const progress = g.targetAmount > 0 ? Math.min((current / g.targetAmount) * 100, 100) : 0;
  const daysLeft = g.deadline ? Math.max(Math.ceil((Date.parse(g.deadline) - Date.now()) / 86_400_000), 0) : null;
  const totalDays = g.deadline ? Math.ceil((Date.parse(g.deadline) - Date.parse(g.createdAt)) / 86_400_000) : 0;
  const expected = totalDays && daysLeft !== null ? ((totalDays - daysLeft) / totalDays) * 100 : 0;
  return { ...g, currentAmount: round(current), progress, remaining: Math.max(round(g.targetAmount - current), 0),
    onTrack: current >= g.targetAmount || progress >= expected, daysLeft };
}

function monthlyTotals() {
  const by: Record<string, { income: number; expense: number }> = {};
  for (const t of live()) {
    const k = monthKey(t.date);
    by[k] ??= { income: 0, expense: 0 };
    by[k][t.type as 'income' | 'expense'] += t.amount;
  }
  return Object.entries(by).sort(([a], [b]) => a.localeCompare(b));
}

function recurring() {
  const groups: Record<string, Row[]> = {};
  for (const t of live().filter((x) => x.isRecurring && x.type === 'expense')) (groups[t.merchant] ??= []).push(t);
  const patterns = Object.entries(groups).map(([merchant, txns], i) => {
    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const c = catById(last.categoryId);
    const next = new Date(last.date);
    next.setMonth(next.getMonth() + 1);
    return {
      id: `rec-${i + 1}`, merchant, description: last.description, amount: last.amount, avgAmount: last.amount,
      frequency: 'monthly', nextExpectedDate: next.toISOString(), lastDate: last.date, transactionCount: sorted.length,
      totalSpent: round(sorted.reduce((s, t) => s + t.amount, 0)), monthlyCost: last.amount, categoryId: last.categoryId,
      categoryName: c?.name ?? 'Other', categoryColor: c?.color ?? '#6b7280',
      transactions: sorted.map((t) => ({ id: t.id, date: t.date, amount: t.amount })),
    };
  });
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();
  return {
    patterns,
    summary: {
      totalMonthlyCost: round(patterns.reduce((s, p) => s + p.monthlyCost, 0)), activeCount: patterns.length,
      upcomingThisMonth: patterns.filter((p) => p.nextExpectedDate <= monthEnd).length,
      totalTransactions: patterns.reduce((s, p) => s + p.transactionCount, 0),
    },
  };
}

function netWorth() {
  const assets = state.accounts.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const liabilities = -state.accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);
  return { netWorth: round(assets - liabilities), totalAssets: round(assets), totalLiabilities: round(liabilities),
    accounts: state.accounts.map(({ id, name, type, balance, currency }) => ({ id, name, type, balance, currency })) };
}

function portfolio() {
  const holdings = state.holdings;
  const value = (h: Row) => h.quantity * (h.currentPrice ?? h.avgCostBasis);
  const cost = (h: Row) => h.quantity * h.avgCostBasis;
  const totalValue = round(holdings.reduce((s, h) => s + value(h), 0));
  const totalCost = round(holdings.reduce((s, h) => s + cost(h), 0));
  const gainLoss = round(totalValue - totalCost);
  const base = { id: 'pf-1', name: 'Long-term', description: 'Index ETF core with a few single stocks', totalValue, totalCost,
    gainLoss, gainLossPct: totalCost ? round((gainLoss / totalCost) * 100) : 0, holdingCount: holdings.length, holdings };
  const allocation = holdings.map((h) => ({ symbol: h.symbol, name: h.name, value: round(value(h)),
    percentage: totalValue ? round((value(h) / totalValue) * 100) : 0, gainLoss: round(value(h) - cost(h)), assetType: h.assetType }));
  return { base, allocation };
}

function linearForecast(values: number[], periods: number) {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / (n || 1);
  const slope = n > 1 ? (values[n - 1] - values[0]) / (n - 1) : 0;
  return Array.from({ length: periods }, (_, i) => round(mean + slope * 0.5 * (i + 1)));
}

function forecast(periods: number) {
  const months = monthlyTotals();
  const dates = months.map(([k]) => `${k}-01`);
  const income = months.map(([, v]) => round(v.income));
  const expense = months.map(([, v]) => round(v.expense));
  const net = months.map(([, v]) => round(v.income - v.expense));
  const series = (values: number[]) => ({
    historical: { dates, values },
    models: {
      moving_average: { forecast: Array(periods).fill(round(values.slice(-3).reduce((a, v) => a + v, 0) / Math.min(3, values.length || 1))), model: 'moving_average', accuracy: 0.81 },
      linear_regression: { forecast: linearForecast(values, periods), model: 'linear_regression', accuracy: 0.83 },
      arima: { forecast: linearForecast(values, periods).map((v) => round(v * 0.98)), model: 'arima', accuracy: 0.84 },
      prophet: { forecast: linearForecast(values, periods).map((v) => round(v * 1.01)), model: 'prophet', accuracy: 0.87 },
    },
  });
  return { monthly_series: { income: { dates, values: income }, expense: { dates, values: expense }, net: { dates, values: net } },
    forecasts: { income: series(income), expense: series(expense), net: series(net) }, periods };
}

function advisorProfile() {
  const months = monthlyTotals().slice(-3);
  const inc = months.reduce((s, [, v]) => s + v.income, 0) / (months.length || 1);
  const exp = months.reduce((s, [, v]) => s + v.expense, 0) / (months.length || 1);
  const savings = state.accounts.find((a) => a.type === 'savings')?.balance ?? 0;
  return { confidence: 'high', monthlyIncomeAvg: round(inc), monthlyExpenseAvg: round(exp),
    savingsRateAvg: inc ? round(((inc - exp) / inc) * 100) : 0, emergencyFundMonths: exp ? round(savings / exp) : 0,
    debtToIncomeRatio: 0.04, riskLevel: 'moderate',
    advisorSummary: 'Steady income, fixed costs about a third of income, and a healthy savings rate. Food & Drink is the category to watch.' };
}

export function advisorReply(message: string) {
  const hit = d.advisorReplies.find((r) => r.match.test(message));
  return (hit ? hit.reply : d.advisorFallback) + d.DEMO_NOTE;
}

export function recordConversation(conversationId: string | null, message: string, reply: string) {
  let conv = state.conversations.find((c) => c.id === conversationId);
  if (!conv) {
    conv = { id: newId('conv'), title: message.slice(0, 48), createdAt: now(), updatedAt: now(), messages: [] };
    state.conversations.unshift(conv);
  }
  conv.messages.push({ id: newId('msg'), role: 'user', content: message }, { id: newId('msg'), role: 'assistant', content: reply });
  conv.updatedAt = now();
  return { conversationId: conv.id, messageId: conv.messages[conv.messages.length - 1].id };
}

function listTransactions(q: Q) {
  let rows = live();
  if (q.type) rows = rows.filter((t) => t.type === q.type);
  if (q.categoryId) rows = rows.filter((t) => t.categoryId === q.categoryId);
  if (q.paymentMethod) rows = rows.filter((t) => t.paymentMethod === q.paymentMethod);
  if (q.startDate) rows = rows.filter((t) => t.date >= q.startDate);
  if (q.endDate) rows = rows.filter((t) => t.date.slice(0, 10) <= q.endDate);
  if (q.search) {
    const s = q.search.toLowerCase();
    rows = rows.filter((t) => `${t.description} ${t.merchant ?? ''}`.toLowerCase().includes(s));
  }
  const field = q.sort === 'amount' ? 'amount' : q.sort === 'description' ? 'description' : 'date';
  const dir = q.order === 'asc' ? 1 : -1;
  rows = [...rows].sort((a, b) => (a[field] > b[field] ? dir : a[field] < b[field] ? -dir : 0));
  const page = Number(q.page || 1);
  const limit = Number(q.limit || 15);
  return { data: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) };
}

function crud(key: keyof typeof state, prefix: string, view: (x: Row) => Row = (x) => x): [string, string, Handler][] {
  const list = () => state[key] as Row[];
  return [
    ['GET', `/${prefix}`, () => list().map(view)],
    ['POST', `/${prefix}`, ({ body }) => { const row = { id: newId(prefix), userId: d.DEMO_USER_ID, createdAt: now(), updatedAt: now(), ...body }; list().unshift(row); return view(row); }],
    ['PUT', `/${prefix}/:id`, ({ params, body }) => { const row = list().find((x) => x.id === params.id); Object.assign(row ?? {}, body, { updatedAt: now() }); return row && view(row); }],
    ['DELETE', `/${prefix}/:id`, ({ params }) => { const i = list().findIndex((x) => x.id === params.id); if (i >= 0) list().splice(i, 1); return null; }],
  ];
}

const routes: [string, string, Handler][] = [
  ['GET', '/auth/profile', () => ({ id: d.DEMO_USER_ID, email: 'demo@finbrain.app', name: 'Demo User', currency: 'USD' })],
  ['DELETE', '/auth/profile', () => null],
  ['GET', '/currency/rates', () => ({ base: 'USD', rates: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.2, JPY: 151, CAD: 1.36, AUD: 1.52 } })],

  ['GET', '/transactions', ({ query }) => listTransactions(query)],
  ['POST', '/transactions/bulk', ({ body }) => {
    const items = (body?.items ?? []).map((t: Row) => ({ id: newId('txn'), userId: d.DEMO_USER_ID, currency: 'USD', status: 'cleared',
      isRecurring: false, deletedAt: null, createdAt: now(), updatedAt: now(), categoryId: 'cat-10', ...t }));
    state.transactions.unshift(...items);
    return { created: items.length };
  }],
  ['DELETE', '/transactions/bulk', ({ body }) => { state.transactions = state.transactions.filter((t) => !body?.ids?.includes(t.id)); return null; }],
  ['POST', '/transactions', ({ body }) => { const t = { id: newId('txn'), userId: d.DEMO_USER_ID, deletedAt: null, createdAt: now(), updatedAt: now(), ...body }; state.transactions.unshift(t); return t; }],
  ['GET', '/transactions/:id', ({ params }) => state.transactions.find((t) => t.id === params.id)],
  ['PUT', '/transactions/:id', ({ params, body }) => { const t = state.transactions.find((x) => x.id === params.id); Object.assign(t ?? {}, body, { updatedAt: now() }); return t; }],
  ['DELETE', '/transactions/:id', ({ params }) => { state.transactions = state.transactions.filter((t) => t.id !== params.id); return null; }],
  ['DELETE', '/seed/transactions', () => { state.transactions = []; return null; }],

  ...crud('categories', 'categories'),
  ['GET', '/budgets/flex/plan', () => {
    const month = new Date().toISOString().slice(0, 7);
    const row = (b: Row) => ({ category: catById(b.categoryId)?.name, budget: b.amount, spent: budgetView(b).spent });
    return { month, fixed: state.budgets.filter((b) => catById(b.categoryId)?.name === 'Bills & Utilities').map(row),
      flexible: state.budgets.filter((b) => catById(b.categoryId)?.name !== 'Bills & Utilities').map(row), nonMonthly: [], suggestedCategories: [] };
  }],
  ...crud('budgets', 'budgets', budgetView),
  ...crud('goals', 'goals', goalView),
  ['POST', '/goals/:id/contributions', ({ params, body }) => {
    const g = state.goals.find((x) => x.id === params.id);
    g?.contributions.unshift({ id: newId('gc'), amount: Number(body.amount), date: body.date ?? now(), notes: body.notes ?? null });
    return { goal: g && goalView(g) };
  }],
  ['DELETE', '/goals/:id/contributions/:cid', ({ params }) => {
    const g = state.goals.find((x) => x.id === params.id);
    if (g) g.contributions = g.contributions.filter((c: Row) => c.id !== params.cid);
    return { goal: g && goalView(g) };
  }],
  ['POST', '/goals/:id/auto-contribute', ({ params }) => {
    const g = state.goals.find((x) => x.id === params.id);
    g?.contributions.unshift({ id: newId('gc'), amount: 100, date: now(), notes: 'Auto-contribution' });
    return { goal: g && goalView(g) };
  }],

  ['GET', '/accounts/net-worth/history', ({ query }) => {
    const months = Number(query.months || 6);
    const nw = netWorth().netWorth;
    return Array.from({ length: months }, (_, i) => {
      const dte = new Date(); dte.setMonth(dte.getMonth() - (months - 1 - i));
      return { month: dte.toISOString().slice(0, 7), netWorth: round(nw - (months - 1 - i) * 520) };
    });
  }],
  ['GET', '/accounts/net-worth', () => netWorth()],
  ...crud('accounts', 'accounts'),

  ['GET', '/recurring', () => recurring()],
  ['GET', '/notifications', () => ({ notifications: state.notifications, unreadCount: state.notifications.filter((n) => !n.read).length })],
  ['POST', '/notifications/read', ({ body }) => {
    for (const n of state.notifications) if (body?.all || body?.ids?.includes(n.id)) n.read = true;
    return { unreadCount: state.notifications.filter((n) => !n.read).length };
  }],
  ['DELETE', '/notifications/:id', ({ params }) => { state.notifications = state.notifications.filter((n) => n.id !== params.id); return null; }],

  ['GET', '/advisor/insights', () => d.insights],
  ['GET', '/advisor/profile', () => advisorProfile()],
  ['GET', '/advisor/conversations', () => state.conversations.map(({ messages, ...c }) => ({ ...c, messageCount: messages.length }))],
  ['GET', '/advisor/conversations/:id', ({ params }) => state.conversations.find((c) => c.id === params.id) ?? { messages: [] }],
  ['POST', '/advisor/messages/:id/feedback', () => null],
  ['POST', '/advisor/chat', ({ body }) => ({ reply: advisorReply(String(body?.message ?? '')) })],
  ['GET', '/advisor/weekly-recap', () => {
    const week = live().filter((t) => Date.parse(t.date) >= Date.now() - 7 * 86_400_000);
    const sum = (type: string) => round(week.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0));
    const byCat: Record<string, number> = {};
    for (const t of week.filter((x) => x.type === 'expense')) byCat[catById(t.categoryId)?.name ?? 'Other'] = (byCat[catById(t.categoryId)?.name ?? 'Other'] ?? 0) + t.amount;
    return {
      period: { start: new Date(Date.now() - 7 * 86_400_000).toISOString(), end: now() },
      totalIncome: sum('income'), totalExpenses: sum('expense'), netCashFlow: round(sum('income') - sum('expense')),
      topSpendingDrivers: Object.entries(byCat).sort(([, a], [, b]) => b - a).slice(0, 3).map(([category, amount]) => ({ category, amount: round(amount) })),
      newRecurringCharges: [{ merchant: 'Urban Sports Club', amount: 34 }],
      budgetProgress: state.budgets.map(budgetView).map((b) => ({ category: catById(b.categoryId)?.name, budget: b.amount, spent: b.spent, utilization: round((b.spent / b.amount) * 100) })),
      goalProgress: state.goals.map(goalView).map((g) => ({ name: g.name, current: g.currentAmount, target: g.targetAmount, progressPercent: round(g.progress) })),
      netWorthMovement: 520, investmentMovement: 84.3,
      recommendedAction: 'Move $150 of this month\'s surplus to the Emergency fund.',
    };
  }],
  ['GET', '/advisor/net-worth-projection', ({ query }) => {
    const months = Number(query.months || 24);
    const start = netWorth().netWorth;
    const flow = advisorProfile().monthlyIncomeAvg - advisorProfile().monthlyExpenseAvg;
    return { currentNetWorth: start, monthlyNetFlow: round(flow),
      projections: Array.from({ length: months }, (_, i) => { const dte = new Date(); dte.setMonth(dte.getMonth() + i + 1); return { month: dte.toISOString().slice(0, 7), netWorth: round(start + flow * (i + 1)) }; }) };
  }],
  ['GET', '/advisor/scenarios', () => state.scenarios],
  ['POST', '/advisor/scenarios/compare', ({ body }) => state.scenarios.filter((s) => body?.ids?.includes(s.id))],
  ['POST', '/advisor/scenarios', ({ body }) => {
    const s = { id: newId('scn'), createdAt: now(), ...body, result: { monthlyImpact: -Number(body?.input?.amount ?? 0), summary: 'Prepared demo result' } };
    state.scenarios.unshift(s); return s;
  }],
  ['DELETE', '/advisor/scenarios/:id', ({ params }) => { state.scenarios = state.scenarios.filter((s) => s.id !== params.id); return null; }],
  ['POST', '/forecast', ({ body }) => forecast(Number(body?.periods ?? 3))],

  ['GET', '/investments/summary', () => {
    const { base } = portfolio();
    const byType: Record<string, number> = {};
    for (const h of state.holdings) byType[h.assetType] = (byType[h.assetType] ?? 0) + h.quantity * (h.currentPrice ?? h.avgCostBasis);
    return { totalValue: base.totalValue, totalCost: base.totalCost, gainLoss: base.gainLoss, gainLossPct: base.gainLossPct,
      portfolioCount: 1, holdingCount: base.holdingCount,
      allocation: Object.entries(byType).map(([type, value]) => ({ type, value: round(value), percentage: round((value / base.totalValue) * 100) })) };
  }],
  ['GET', '/investments/portfolios', () => [portfolio().base]],
  ['GET', '/investments/portfolios/:id', () => ({ ...portfolio().base, allocation: portfolio().allocation })],
  ['POST', '/investments/portfolios', () => portfolio().base],
  ['GET', '/investments/top-movers', () => {
    const rows = state.holdings.map((h, i) => ({ symbol: h.symbol, name: h.name,
      gainLossPercent: round(((h.currentPrice - h.avgCostBasis) / h.avgCostBasis) * 100), dailyChangePercent: [0.8, 1.4, -0.6, -2.1][i % 4] }));
    return { gainers: rows.filter((r) => r.dailyChangePercent > 0), losers: rows.filter((r) => r.dailyChangePercent < 0) };
  }],
  ['POST', '/investments/holdings/refresh-prices', () => ({ updated: state.holdings.length })],
  ['POST', '/investments/holdings', ({ body }) => { const h = { id: newId('hold'), currency: 'USD', ...body }; state.holdings.push(h); return h; }],
  ['DELETE', '/investments/holdings/:id', ({ params }) => { state.holdings = state.holdings.filter((h) => h.id !== params.id); return null; }],

  ['GET', '/credit-score', () => ({ scores: state.creditScores, latest: state.creditScores[state.creditScores.length - 1] })],
  ['POST', '/credit-score', ({ body }) => { const s = { id: newId('cs'), createdAt: now(), ...body }; state.creditScores.push(s); return s; }],
  ['DELETE', '/credit-score/:id', ({ params }) => { state.creditScores = state.creditScores.filter((s) => s.id !== params.id); return null; }],

  ['GET', '/households', () => null],
  ['GET', '/data-quality/summary', () => ({ score: 92, confidence: 'high', transactionCount: live().length, categorizedPercent: 100,
    issues: [{ type: 'uncategorized', severity: 'low', description: 'A few transactions sit in Other', count: live().filter((t) => t.categoryId === 'cat-10').length }],
    recommendations: ['Add a rule for recurring "Miscellaneous" purchases'] })],
  ['GET', '/search', ({ query }) => {
    const s = (query.q ?? '').toLowerCase();
    const tx = live().filter((t) => `${t.description} ${t.merchant}`.toLowerCase().includes(s)).slice(0, 5);
    return {
      transactions: tx.map((t) => ({ id: t.id, label: t.merchant ?? t.description, sublabel: t.date.slice(0, 10), amount: t.amount, type: t.type, navigateTo: '/transactions' })),
      categories: state.categories.filter((c) => c.name.toLowerCase().includes(s)).map((c) => ({ id: c.id, label: c.name, sublabel: 'Category', color: c.color, navigateTo: '/categories' })),
      accounts: state.accounts.filter((a) => a.name.toLowerCase().includes(s)).map((a) => ({ id: a.id, label: a.name, sublabel: a.institution, amount: a.balance, navigateTo: '/accounts' })),
      budgets: [], goals: state.goals.filter((g) => g.name.toLowerCase().includes(s)).map((g) => ({ id: g.id, label: g.name, sublabel: 'Goal', navigateTo: '/goals' })),
    };
  }],
  ['GET', '/rules', () => state.rules],
  ['POST', '/rules/preview', () => ({ matched: 0, scanned: live().length, sample: [] })],
  ['POST', '/rules/apply', ({ body }) => ({ dryRun: !!body?.dryRun, scanned: live().length, changed: 0, byRule: [] })],
  ['POST', '/rules/reorder', () => null],
  ['POST', '/rules', ({ body }) => { const r = { id: newId('rule'), isActive: true, priority: 0, createdAt: now(), updatedAt: now(), ...body, category: catById(body?.categoryId) }; state.rules.push(r); return r; }],
  ['PUT', '/rules/:id', ({ params, body }) => { const r = state.rules.find((x) => x.id === params.id); Object.assign(r ?? {}, body); return r; }],
  ['DELETE', '/rules/:id', ({ params }) => { state.rules = state.rules.filter((r) => r.id !== params.id); return null; }],
];

/** Features that need a real backend or a third party answer with a clear message instead of failing silently. */
const UNAVAILABLE = /^\/(receipts\/ocr|import\/parse|plaid\/|scheduled-reports|households\/)/;

function match(method: string, path: string): { handler: Handler; params: Record<string, string> } | null {
  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue;
    const a = pattern.split('/');
    const b = path.split('/');
    if (a.length !== b.length) continue;
    const params: Record<string, string> = {};
    if (a.every((seg, i) => (seg.startsWith(':') ? ((params[seg.slice(1)] = decodeURIComponent(b[i])), true) : seg === b[i]))) {
      return { handler, params };
    }
  }
  return null;
}

export const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = new URL(config.url ?? '', 'http://demo/api/v1/');
  const path = url.pathname.replace(/^\/api\/v1/, '').replace(/\/$/, '') || '/';
  const method = (config.method ?? 'get').toUpperCase();
  const query: Q = Object.fromEntries(url.searchParams);
  for (const [k, v] of Object.entries(config.params ?? {})) if (v !== undefined && v !== null) query[k] = String(v);
  const body = typeof config.data === 'string' ? JSON.parse(config.data || 'null') : config.data;

  await new Promise((r) => setTimeout(r, 120)); // a little latency so loading states look real
  const respond = (status: number, data: unknown): AxiosResponse => ({ data, status, statusText: String(status), headers: {}, config, request: {} });

  if (UNAVAILABLE.test(path)) {
    const res = respond(501, { success: false, error: 'Not available in the demo: this feature needs the full app with its backend.' });
    return Promise.reject(Object.assign(new Error('Not available in the demo'), { isAxiosError: true, response: res, config }));
  }
  const hit = match(method, path);
  if (!hit) {
    // eslint-disable-next-line no-console -- tells a developer which route the demo does not cover
    console.info(`[demo] no sample data for ${method} ${path}`);
    return respond(200, ok([]));
  }
  return respond(200, ok(hit.handler({ method, params: hit.params, query, body })));
};
