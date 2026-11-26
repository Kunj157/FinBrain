/**
 * Sample data for the static demo build (VITE_DEMO=1). Deterministic: the same
 * seed gives the same account on every visit, with dates anchored to today so
 * the dashboard always looks current. Nothing here leaves the browser.
 */

export const DEMO_USER_ID = 'demo-user';

// mulberry32: small, fast, seeded
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20261126);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const amount = (min: number, max: number) => Math.round((rand() * (max - min) + min) * 100) / 100;

const DAY = 86_400_000;
const today = new Date();
today.setHours(12, 0, 0, 0);
export const daysAgo = (n: number) => new Date(today.getTime() - n * DAY);
export const iso = (d: Date) => d.toISOString();

const CREATED = iso(daysAgo(200));

// Same names, icons and colours as apps/api/src/seed-defaults.ts
const CATEGORY_DEFS = [
  { name: 'Income', icon: 'dollar-sign', color: '#10b981' },
  { name: 'Food & Drink', icon: 'utensils', color: '#f59e0b' },
  { name: 'Shopping', icon: 'shopping-cart', color: '#8b5cf6' },
  { name: 'Transport', icon: 'car', color: '#3b82f6' },
  { name: 'Bills & Utilities', icon: 'zap', color: '#ef4444' },
  { name: 'Entertainment', icon: 'gamepad', color: '#ec4899' },
  { name: 'Healthcare', icon: 'heart', color: '#14b8a6' },
  { name: 'Education', icon: 'book', color: '#6366f1' },
  { name: 'Housing', icon: 'house', color: '#f97316' },
  { name: 'Other', icon: 'folder', color: '#6b7280' },
];

export const categories = CATEGORY_DEFS.map((c, i) => ({
  id: `cat-${i + 1}`,
  userId: DEMO_USER_ID,
  parentId: null,
  isCustom: false,
  createdAt: CREATED,
  ...c,
}));
const cat = (name: string) => categories.find((c) => c.name === name)!;

// Spending lists in the style of apps/api/src/scripts/seed.ts
const SPEND: Record<string, { merchants: string[]; descs: string[]; min: number; max: number; perMonth: number }> = {
  'Food & Drink': { merchants: ['Rewe', 'Lidl', 'Starbucks', 'Edeka', 'Chipotle', 'Aldi'], descs: ['Groceries', 'Coffee', 'Lunch', 'Dinner', 'Takeout'], min: 4, max: 85, perMonth: 14 },
  Shopping: { merchants: ['Amazon', 'IKEA', 'Zalando', 'MediaMarkt', 'H&M'], descs: ['Online shopping', 'Clothing', 'Electronics', 'Home decor'], min: 12, max: 160, perMonth: 4 },
  Transport: { merchants: ['Deutsche Bahn', 'Uber', 'Shell', 'BVG'], descs: ['Train ticket', 'Ride share', 'Fuel', 'Monthly pass'], min: 3, max: 70, perMonth: 5 },
  Entertainment: { merchants: ['Cinestar', 'Steam', 'Eventim'], descs: ['Movie ticket', 'Game purchase', 'Concert ticket'], min: 9, max: 60, perMonth: 2 },
  Healthcare: { merchants: ['DM Drogerie', 'Apotheke'], descs: ['Pharmacy', 'Vitamins', 'Prescription'], min: 5, max: 40, perMonth: 1 },
  Education: { merchants: ['Udemy', 'Coursera', 'Thalia'], descs: ['Online course', 'Books'], min: 10, max: 50, perMonth: 1 },
  Other: { merchants: ['Miscellaneous'], descs: ['Misc purchase'], min: 5, max: 30, perMonth: 1 },
};

// Fixed monthly items: [day of month, merchant, description, category, amount, type]
const MONTHLY: [number, string, string, string, number, 'income' | 'expense'][] = [
  [1, 'Employer GmbH', 'Monthly salary', 'Income', 3450, 'income'],
  [3, 'Property Management Co.', 'Rent', 'Housing', 980, 'expense'],
  [5, 'Stadtwerke', 'Electricity', 'Bills & Utilities', 64, 'expense'],
  [7, 'Telekom', 'Internet', 'Bills & Utilities', 39.95, 'expense'],
  [9, 'Netflix', 'Streaming subscription', 'Entertainment', 13.99, 'expense'],
  [9, 'Spotify', 'Streaming subscription', 'Entertainment', 10.99, 'expense'],
  [12, 'Urban Sports Club', 'Gym membership', 'Healthcare', 34, 'expense'],
  [15, 'Freelance Client', 'Freelance payment', 'Income', 600, 'income'],
];

const PAYMENT = ['debit_card', 'credit_card', 'bank_transfer', 'cash'] as const;

function makeTransactions() {
  const out: Record<string, unknown>[] = [];
  let n = 0;
  const add = (date: Date, merchant: string, description: string, category: string, value: number,
    type: 'income' | 'expense', isRecurring: boolean) => {
    const at = iso(date);
    out.push({
      id: `txn-${++n}`, userId: DEMO_USER_ID, type, amount: value, currency: 'USD', description, merchant,
      categoryId: cat(category).id, paymentMethod: type === 'income' ? 'bank_transfer' : pick(PAYMENT), date: at,
      notes: null, receiptUrl: null, status: 'cleared', isRecurring, deletedAt: null, createdAt: at, updatedAt: at,
    });
  };
  for (let m = 5; m >= 0; m--) {
    const month = new Date(today.getFullYear(), today.getMonth() - m, 1, 12);
    for (const [day, merchant, desc, category, value, type] of MONTHLY) {
      const d = new Date(month.getFullYear(), month.getMonth(), day, 12);
      if (d <= today) add(d, merchant, desc, category, value, type, true);
    }
    for (const [category, s] of Object.entries(SPEND)) {
      for (let i = 0; i < s.perMonth; i++) {
        const d = new Date(month.getFullYear(), month.getMonth(), 1 + Math.floor(rand() * 28), 12);
        if (d <= today) add(d, pick(s.merchants), pick(s.descs), category, amount(s.min, s.max), 'expense', false);
      }
    }
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export const transactions = makeTransactions();

const monthStart = iso(new Date(today.getFullYear(), today.getMonth(), 1, 12));

export const budgets = [
  ['Food & Drink', 450], ['Shopping', 300], ['Transport', 150], ['Entertainment', 90], ['Bills & Utilities', 120],
].map(([name, value], i) => ({
  id: `bud-${i + 1}`, userId: DEMO_USER_ID, categoryId: cat(name as string).id, amount: value as number, currency: 'USD',
  period: 'monthly', startDate: monthStart, endDate: null, createdAt: CREATED, updatedAt: CREATED,
  budgetMode: 'category', bucketType: null,
}));

export const goals = [
  { name: 'Emergency fund', goalType: 'emergency', icon: 'shield', targetAmount: 6000, deadline: 240, paid: [600, 550, 500, 650, 500] },
  { name: 'Summer trip to Lisbon', goalType: 'vacation', icon: 'plane', targetAmount: 1800, deadline: 150, paid: [250, 200, 300] },
  { name: 'New laptop', goalType: 'custom', icon: 'laptop', targetAmount: 1500, deadline: 60, paid: [400, 350, 300, 200] },
].map((g, i) => ({
  id: `goal-${i + 1}`, userId: DEMO_USER_ID, name: g.name, targetAmount: g.targetAmount, currency: 'USD',
  currentAmount: 0, deadline: iso(new Date(today.getTime() + g.deadline * DAY)), goalType: g.goalType, icon: g.icon,
  categoryId: null, createdAt: CREATED, updatedAt: CREATED,
  contributions: g.paid.map((value, j) => ({ id: `gc-${i + 1}-${j + 1}`, amount: value, date: iso(daysAgo(30 * (g.paid.length - j))), notes: null })),
}));

export const accounts = [
  { name: 'Main checking', type: 'checking', balance: 2840.5, institution: 'N26' },
  { name: 'Savings', type: 'savings', balance: 7350, institution: 'ING' },
  { name: 'Credit card', type: 'credit', balance: -412.3, institution: 'Visa' },
  { name: 'ETF portfolio', type: 'investment', balance: 5210, institution: 'Trade Republic' },
].map((a, i) => ({ id: `acc-${i + 1}`, userId: DEMO_USER_ID, currency: 'USD', isActive: true, createdAt: CREATED, updatedAt: CREATED, ...a }));

export const holdings = [
  { symbol: 'VWCE', name: 'Vanguard FTSE All-World', quantity: 28, avgCostBasis: 112.4, currentPrice: 128.9, assetType: 'etf' },
  { symbol: 'AAPL', name: 'Apple Inc.', quantity: 6, avgCostBasis: 178.2, currentPrice: 231.5, assetType: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 3, avgCostBasis: 402.1, currentPrice: 438.7, assetType: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', quantity: 0.012, avgCostBasis: 61000, currentPrice: 67500, assetType: 'crypto' },
].map((h, i) => ({ id: `hold-${i + 1}`, portfolioId: 'pf-1', currency: 'USD', ...h }));

export const creditScores = [712, 718, 721, 730, 736, 741].map((score, i) => ({
  id: `cs-${i + 1}`, score, provider: 'manual', date: iso(daysAgo(30 * (5 - i))), createdAt: iso(daysAgo(30 * (5 - i))),
}));

export const notifications = [
  { id: 'n-1', title: 'Food & Drink budget at 82%', message: 'You have $81 left for this month.', type: 'budget', read: false, createdAt: iso(daysAgo(1)) },
  { id: 'n-2', title: 'New recurring charge', message: 'Urban Sports Club ($34.00) looks monthly.', type: 'recurring', read: false, createdAt: iso(daysAgo(3)) },
  { id: 'n-3', title: 'Goal milestone', message: 'New laptop is 83% funded.', type: 'goal', read: true, createdAt: iso(daysAgo(6)) },
];

export const insights = [
  { id: 'ins-1', type: 'spending', title: 'Dining out is up this month', summary: 'Food & Drink is running ahead of your 3-month average. Cooking two more dinners a week would keep you inside the budget.', severity: 'warning', actions: ['Review Food & Drink', 'Adjust budget'] },
  { id: 'ins-2', type: 'savings', title: 'Savings rate is healthy', summary: 'You kept about a quarter of your income over the last three months, above the 20% guideline.', severity: 'positive', actions: ['Move surplus to Emergency fund'] },
  { id: 'ins-3', type: 'subscriptions', title: '4 subscriptions cost $98.93 a month', summary: 'Streaming, internet and gym are charged every month. Check whether you still use all of them.', severity: 'info', actions: ['Open Recurring'] },
];

/** Canned advisor answers: the demo has no model behind it, so every reply says so. */
export const advisorReplies: { match: RegExp; reply: string }[] = [
  { match: /save|saving/i, reply: 'Over the last three months you saved about 25% of your income. The quickest win is Food & Drink: it is above your 3-month average. Moving $150 a month from there to the Emergency fund would finish that goal about two months earlier.' },
  { match: /budget|spend|spent/i, reply: 'This month Food & Drink and Shopping are the two categories closest to their budgets. Bills & Utilities and Transport are comfortably under. Fixed costs (rent, utilities, subscriptions) are about 35% of income.' },
  { match: /invest|portfolio|etf|stock/i, reply: 'Your portfolio is mostly a global ETF with a few single stocks and a small crypto position. It is up overall. A single all-world ETF already holds Apple and Microsoft, so the single stocks add concentration rather than diversification.' },
];
export const advisorFallback = 'In the live app this answer is generated from your own transactions. In this demo the advisor gives prepared answers: try asking how to save more, how your budgets look, or about your investments.';
export const DEMO_NOTE = '\n\n_Demo: prepared answer, not generated live._';
