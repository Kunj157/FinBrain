import { prisma } from '../../prisma';
import { getAdvisorProfile, type AdvisorProfileData } from './profile-engine';
import { sumIncome, sumExpenses, roundMoney, computeRunway, computeNetWorth } from '../finance-math';

export interface AdvisorContext {
  profile: AdvisorProfileData;
  recentTransactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: string;
    category: string;
  }>;
  cashFlowProjection: {
    currentBalance: number;
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    projected30Day: number;
    projected60Day: number;
    projected90Day: number;
  };
  upcomingBills: Array<{
    merchant: string;
    amount: number;
    expectedDate: string;
  }>;
  goalSummary: Array<{
    name: string;
    target: number;
    current: number;
    progressPercent: number;
    deadline: string | null;
  }>;
  budgetSummary: Array<{
    category: string;
    limit: number;
    spent: number;
    utilization: number;
  }>;
  investmentSummary: {
    totalValue: number;
    totalCost: number;
    holdingsCount: number;
  };
}

export async function buildAdvisorContext(userId: string): Promise<AdvisorContext> {
  const profile = await getAdvisorProfile(userId);
  if (!profile) throw new Error('Could not build advisor profile');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [transactions, accounts, budgets, goals, holdings] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: sixMonthsAgo } },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.account.findMany({ where: { userId } }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.holding.findMany({ where: { portfolio: { userId } } }),
  ]);

  const recentTransactions = transactions.slice(0, 20).map((t) => ({
    date: new Date(t.date).toISOString().split('T')[0],
    description: t.merchant || t.description,
    amount: roundMoney(Math.abs(t.amount)),
    type: t.type,
    category: t.category?.name || 'Other',
  }));

  const totalAssets = accounts
    .filter((a) => ['checking', 'savings', 'investment', 'real_estate'].includes(a.type))
    .reduce((s, a) => s + a.balance, 0);

  const currentBalance = accounts
    .filter((a) => a.type === 'checking')
    .reduce((s, a) => s + a.balance, 0);

  const avgMonthlyIncome = profile.monthlyIncomeAvg;
  const avgMonthlyExpenses = profile.monthlyExpenseAvg;

  const cashFlowProjection = {
    currentBalance: roundMoney(currentBalance),
    avgMonthlyIncome,
    avgMonthlyExpenses,
    projected30Day: roundMoney(currentBalance + (avgMonthlyIncome - avgMonthlyExpenses)),
    projected60Day: roundMoney(currentBalance + 2 * (avgMonthlyIncome - avgMonthlyExpenses)),
    projected90Day: roundMoney(currentBalance + 3 * (avgMonthlyIncome - avgMonthlyExpenses)),
  };

  const recurringExpenses = transactions.filter((t) => t.type === 'expense' && t.isRecurring);
  const upcomingBills: Array<{ merchant: string; amount: number; expectedDate: string }> = [];
  for (const t of recurringExpenses.slice(0, 10)) {
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 30);
    upcomingBills.push({
      merchant: t.merchant || t.description,
      amount: roundMoney(Math.abs(t.amount)),
      expectedDate: nextDate.toISOString().split('T')[0],
    });
  }

  const goalSummary = goals.map((g) => ({
    name: g.name,
    target: g.targetAmount,
    current: g.currentAmount,
    progressPercent: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 10000) / 100 : 0,
    deadline: g.deadline?.toISOString().split('T')[0] || null,
  }));

  const budgetSummary = budgets.map((b) => ({
    category: b.category?.name || 'Unknown',
    limit: b.amount,
    spent: b.spent,
    utilization: b.amount > 0 ? Math.round((b.spent / b.amount) * 10000) / 100 : 0,
  }));

  const investmentSummary = {
    totalValue: holdings.reduce((s, h) => s + (h.currentPrice || h.avgCostBasis) * h.quantity, 0),
    totalCost: holdings.reduce((s, h) => s + h.avgCostBasis * h.quantity, 0),
    holdingsCount: holdings.length,
  };

  return {
    profile,
    recentTransactions,
    cashFlowProjection,
    upcomingBills,
    goalSummary,
    budgetSummary,
    investmentSummary,
  };
}

export function contextToString(ctx: AdvisorContext): string {
  return JSON.stringify({
    profile: {
      confidence: ctx.profile.confidence,
      monthlyIncome: ctx.profile.monthlyIncomeAvg,
      monthlyExpenses: ctx.profile.monthlyExpenseAvg,
      savingsRate: ctx.profile.savingsRateAvg,
      emergencyFundMonths: ctx.profile.emergencyFundMonths,
      debtToIncomeRatio: ctx.profile.debtToIncomeRatio,
      riskLevel: ctx.profile.riskLevel,
    },
    cashFlow: ctx.cashFlowProjection,
    goals: ctx.goalSummary,
    budgets: ctx.budgetSummary,
    investments: ctx.investmentSummary,
    upcomingBills: ctx.upcomingBills.slice(0, 5),
    recentTransactions: ctx.recentTransactions.slice(0, 10),
  }, null, 2);
}
