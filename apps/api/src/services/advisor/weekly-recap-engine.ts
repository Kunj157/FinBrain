import { prisma } from '../../prisma';
import { roundMoney, sumIncome, sumExpenses } from '../finance-math';

export interface WeeklyRecap {
  period: { start: string; end: string };
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  topSpendingDrivers: Array<{ category: string; amount: number }>;
  newRecurringCharges: Array<{ merchant: string; amount: number }>;
  budgetProgress: Array<{ category: string; budget: number; spent: number; utilization: number }>;
  goalProgress: Array<{ name: string; current: number; target: number; progressPercent: number }>;
  netWorthMovement: number;
  investmentMovement: number;
  recommendedAction: string;
}

export async function generateWeeklyRecap(userId: string): Promise<WeeklyRecap> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [thisWeekTxns, lastWeekTxns, budgets, goals, accounts, holdings] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: weekAgo } },
      include: { category: { select: { name: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: twoWeeksAgo, lt: weekAgo } },
      include: { category: { select: { name: true } } },
    }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.account.findMany({ where: { userId } }),
    prisma.holding.findMany({ where: { portfolio: { userId } } }),
  ]);

  const totalIncome = sumIncome(thisWeekTxns);
  const totalExpenses = sumExpenses(thisWeekTxns);
  const netCashFlow = totalIncome - totalExpenses;

  const catMap: Record<string, number> = {};
  for (const t of thisWeekTxns.filter((t) => t.type === 'expense')) {
    const c = t.category?.name || 'Other';
    catMap[c] = (catMap[c] || 0) + Math.abs(t.amount);
  }
  const topSpendingDrivers = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount: roundMoney(amount) }));

  const thisWeekMerchants = new Set(
    thisWeekTxns.filter((t) => t.isRecurring).map((t) => t.merchant || t.description)
  );
  const lastWeekMerchants = new Set(
    lastWeekTxns.filter((t) => t.isRecurring).map((t) => t.merchant || t.description)
  );
  const newRecurringCharges = thisWeekTxns
    .filter((t) => t.isRecurring && !lastWeekMerchants.has(t.merchant || t.description))
    .map((t) => ({ merchant: t.merchant || t.description, amount: roundMoney(Math.abs(t.amount)) }));

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTxns = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, date: { gte: thisMonthStart } },
    include: { category: { select: { name: true } } },
  });

  const monthCatMap: Record<string, number> = {};
  for (const t of thisMonthTxns.filter((t) => t.type === 'expense')) {
    const c = t.category?.name || 'Other';
    monthCatMap[c] = (monthCatMap[c] || 0) + Math.abs(t.amount);
  }

  const budgetProgress = budgets.map((b) => {
    const catName = b.category?.name || 'Unknown';
    const spent = monthCatMap[catName] || 0;
    return {
      category: catName,
      budget: b.amount,
      spent: roundMoney(spent),
      utilization: b.amount > 0 ? roundMoney((spent / b.amount) * 100) : 0,
    };
  });

  const goalProgress = goals.map((g) => ({
    name: g.name,
    current: g.currentAmount,
    target: g.targetAmount,
    progressPercent: g.targetAmount > 0 ? roundMoney((g.currentAmount / g.targetAmount) * 100) : 0,
  }));

  const totalAssets = accounts
    .filter((a) => ['checking', 'savings', 'investment', 'real_estate'].includes(a.type))
    .reduce((s, a) => s + a.balance, 0);

  const lastWeekAssets = totalAssets - netCashFlow;

  const investmentValue = holdings.reduce((s, h) => s + (h.currentPrice || h.avgCostBasis) * h.quantity, 0);
  const investmentCost = holdings.reduce((s, h) => s + h.avgCostBasis * h.quantity, 0);
  const investmentMovement = roundMoney(investmentValue - investmentCost);

  let recommendedAction = 'Keep up the good work! Your finances are on track.';
  if (netCashFlow < 0) {
    recommendedAction = 'Your expenses exceeded income this week. Review your top spending categories and consider reducing discretionary spending.';
  } else if (budgetProgress.some((b) => b.utilization > 90)) {
    const overBudget = budgetProgress.find((b) => b.utilization > 90);
    recommendedAction = `Your ${overBudget?.category} budget is at ${overBudget?.utilization}%. Consider slowing down spending in this category.`;
  } else if (goalProgress.some((g) => g.progressPercent < 50 && g.target > 0)) {
    recommendedAction = 'Some goals are behind pace. Consider setting up auto-contributions to stay on track.';
  }

  return {
    period: {
      start: weekAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    totalIncome: roundMoney(totalIncome),
    totalExpenses: roundMoney(totalExpenses),
    netCashFlow: roundMoney(netCashFlow),
    topSpendingDrivers,
    newRecurringCharges,
    budgetProgress,
    goalProgress,
    netWorthMovement: roundMoney(netCashFlow),
    investmentMovement,
    recommendedAction,
  };
}
