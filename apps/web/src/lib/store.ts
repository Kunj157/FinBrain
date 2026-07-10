import type { Transaction, DashboardSummary, Category, Currency } from '@finbrain/shared';

const STORE_PREFIX = 'finbrain-';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch {
    // quota exceeded or private mode
  }
}

export const localStore = {
  getTransactions: () => read<Transaction[]>('transactions', []),
  setTransactions: (txns: Transaction[]) => write('transactions', txns),
  addTransaction: (txn: Transaction) => {
    const all = localStore.getTransactions();
    all.unshift(txn);
    localStore.setTransactions(all);
    return txn;
  },
  updateTransaction: (id: string, updates: Partial<Transaction>) => {
    const all = localStore.getTransactions();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    localStore.setTransactions(all);
    return all[idx];
  },
  deleteTransaction: (id: string) => {
    const all = localStore.getTransactions();
    const filtered = all.filter((t) => t.id !== id);
    localStore.setTransactions(filtered);
  },

  getCategories: () =>
    read<Category[]>('categories', [
      { id: '1', userId: '', name: 'Income', icon: 'trending-up', color: '#10b981', isCustom: false, createdAt: '' },
      { id: '2', userId: '', name: 'Food & Drink', icon: 'utensils', color: '#f59e0b', isCustom: false, createdAt: '' },
      { id: '3', userId: '', name: 'Shopping', icon: 'shopping-bag', color: '#8b5cf6', isCustom: false, createdAt: '' },
      { id: '4', userId: '', name: 'Transport', icon: 'car', color: '#3b82f6', isCustom: false, createdAt: '' },
      { id: '5', userId: '', name: 'Bills & Utilities', icon: 'receipt', color: '#ef4444', isCustom: false, createdAt: '' },
      { id: '6', userId: '', name: 'Entertainment', icon: 'film', color: '#ec4899', isCustom: false, createdAt: '' },
      { id: '7', userId: '', name: 'Healthcare', icon: 'heart', color: '#14b8a6', isCustom: false, createdAt: '' },
      { id: '8', userId: '', name: 'Education', icon: 'book', color: '#6366f1', isCustom: false, createdAt: '' },
      { id: '9', userId: '', name: 'Housing', icon: 'home', color: '#f97316', isCustom: false, createdAt: '' },
      { id: '10', userId: '', name: 'Other', icon: 'more-horizontal', color: '#6b7280', isCustom: false, createdAt: '' },
    ]),

  addCategory: (cat: Category) => {
    const all = localStore.getCategories();
    all.push(cat);
    write('categories', all);
    return cat;
  },
  setCategories: (cats: Category[]) => write('categories', cats),

  getPreferredCurrency: (): Currency => {
    const stored = localStorage.getItem('finbrain-currency') as Currency | null;
    return stored || 'USD';
  },

  getSummary: (): DashboardSummary => {
    const txns = localStore.getTransactions();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthly = txns.filter((t) => new Date(t.date) >= monthStart);
    const income = monthly.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthly.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const allIncome = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const allExpenses = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return {
      currentBalance: allIncome - allExpenses,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      savings: income - expenses,
      budgetUtilization: expenses > 0 ? (expenses / (income || 1)) * 100 : 0,
      currency: localStore.getPreferredCurrency(),
    };
  },

  clear: () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};
