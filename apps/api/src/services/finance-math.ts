import { type Transaction, type Account, type Budget, type Goal, type Holding } from '@prisma/client';

type TxnWithCategory = Transaction & { category?: { name: string } | null };

export function getTransactionAmountAbs(txn: Transaction): number {
  return Math.abs(txn.amount);
}

export function getTransactionSignedAmount(txn: Transaction): number {
  return txn.type === 'income' ? Math.abs(txn.amount) : -Math.abs(txn.amount);
}

export function sumIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'income' && !t.deletedAt)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function sumExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'expense' && !t.deletedAt)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function sumNetCashFlow(transactions: Transaction[]): number {
  return sumIncome(transactions) - sumExpenses(transactions);
}

export function computeSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}

export function computeRunway(totalAssets: number, avgMonthlyExpenses: number): number {
  if (avgMonthlyExpenses <= 0) return Infinity;
  return totalAssets / avgMonthlyExpenses;
}

export function computeDebtToIncome(totalLiabilities: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0;
  return totalLiabilities / monthlyIncome;
}

export function computeNetWorth(accounts: Account[]): number {
  return accounts.reduce((sum, a) => {
    if (['credit', 'loan'].includes(a.type)) {
      return sum - Math.abs(a.balance);
    }
    return sum + a.balance;
  }, 0);
}

export function computeTotalAssets(accounts: Account[]): number {
  return accounts
    .filter((a) => ['checking', 'savings', 'investment', 'real_estate'].includes(a.type))
    .reduce((sum, a) => sum + a.balance, 0);
}

export function computeTotalLiabilities(accounts: Account[]): number {
  return accounts
    .filter((a) => ['credit', 'loan'].includes(a.type))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);
}

export function groupExpensesByCategory(transactions: TxnWithCategory[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  for (const t of transactions.filter((t) => t.type === 'expense' && !t.deletedAt)) {
    const name = t.category?.name || 'Other';
    grouped[name] = (grouped[name] || 0) + Math.abs(t.amount);
  }
  return grouped;
}

export function groupExpensesByMerchant(transactions: TxnWithCategory[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  for (const t of transactions.filter((t) => t.type === 'expense' && !t.deletedAt)) {
    const merchant = t.merchant || t.description || 'Unknown';
    grouped[merchant] = (grouped[merchant] || 0) + Math.abs(t.amount);
  }
  return grouped;
}

export function getTopCategories(grouped: Record<string, number>, limit: number = 5): Array<{ name: string; amount: number }> {
  return Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));
}

export function getTopMerchants(grouped: Record<string, number>, limit: number = 10): Array<{ name: string; amount: number }> {
  return Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  start: Date,
  end: Date,
): Transaction[] {
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
}

export function getCurrentMonthTransactions(transactions: Transaction[]): Transaction[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return filterTransactionsByDateRange(transactions, start, end);
}

export function getLastMonthTransactions(transactions: Transaction[]): Transaction[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return filterTransactionsByDateRange(transactions, start, end);
}

export function computeCategoryBudgetUtilization(
  budgets: Budget[],
  categoryExpenses: Record<string, number>,
): Array<{ category: string; budget: number; spent: number; utilization: number }> {
  return budgets.map((b) => {
    const catName = (b as Budget & { category?: { name: string } }).category?.name || 'Unknown';
    const spent = categoryExpenses[catName] || 0;
    const utilization = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    return {
      category: catName,
      budget: b.amount,
      spent: Math.round(spent * 100) / 100,
      utilization: Math.round(utilization * 100) / 100,
    };
  });
}

export function computeGoalProgress(goals: Goal[]): Array<{
  name: string;
  target: number;
  current: number;
  progressPercent: number;
  deadline: string | null;
  daysRemaining: number | null;
}> {
  return goals.map((g) => {
    const progressPercent = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
    const deadline = g.deadline?.toISOString().split('T')[0] || null;
    const daysRemaining = g.deadline
      ? Math.max(0, Math.ceil((g.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;
    return {
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount,
      progressPercent: Math.round(progressPercent * 100) / 100,
      deadline,
      daysRemaining,
    };
  });
}

export function computeInvestmentSummary(holdings: Holding[]): {
  totalValue: number;
  totalCost: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
} {
  let totalValue = 0;
  let totalCost = 0;

  for (const h of holdings) {
    const currentVal = (h.currentPrice || h.avgCostBasis) * h.quantity;
    const costVal = h.avgCostBasis * h.quantity;
    totalValue += currentVal;
    totalCost += costVal;
  }

  const unrealizedGain = totalValue - totalCost;
  const unrealizedGainPercent = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0;

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    unrealizedGain: Math.round(unrealizedGain * 100) / 100,
    unrealizedGainPercent: Math.round(unrealizedGainPercent * 100) / 100,
  };
}

export function computeEmergencyFundMonths(
  savingsBalance: number,
  avgMonthlyExpenses: number,
): number {
  if (avgMonthlyExpenses <= 0) return 0;
  return Math.round((savingsBalance / avgMonthlyExpenses) * 10) / 10;
}

export function computeFixedVsVariableExpenses(
  transactions: Transaction[],
): { fixedRatio: number; variableRatio: number; fixedTotal: number; variableTotal: number } {
  const expenses = transactions.filter((t) => t.type === 'expense' && !t.deletedAt);
  if (expenses.length === 0) return { fixedRatio: 0, variableRatio: 0, fixedTotal: 0, variableTotal: 0 };

  const recurring = expenses.filter((t) => t.isRecurring);
  const fixedTotal = recurring.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const variableTotal = totalExpenses - fixedTotal;

  return {
    fixedRatio: totalExpenses > 0 ? Math.round((fixedTotal / totalExpenses) * 10000) / 100 : 0,
    variableRatio: totalExpenses > 0 ? Math.round((variableTotal / totalExpenses) * 10000) / 100 : 0,
    fixedTotal: Math.round(fixedTotal * 100) / 100,
    variableTotal: Math.round(variableTotal * 100) / 100,
  };
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
