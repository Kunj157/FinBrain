import { type Prisma, type Transaction, type Account, type Budget, type Goal, type Holding } from '@prisma/client';
import { prisma } from '../../prisma';
import {
  sumIncome,
  sumExpenses,
  computeSavingsRate,
  computeEmergencyFundMonths,
  computeDebtToIncome,
  computeTotalAssets,
  computeTotalLiabilities,
  computeFixedVsVariableExpenses,
  roundMoney,
} from '../finance-math';
import { computeConfidence, type ConfidenceFactors } from './confidence';

type TxnWithCategory = Transaction & { category?: { name: string } | null };

export interface AdvisorProfileData {
  dataStartDate: Date | null;
  dataEndDate: Date | null;
  transactionCount: number;
  dataQualityScore: number;
  confidence: string;

  monthlyIncomeAvg: number;
  monthlyExpenseAvg: number;
  savingsRateAvg: number;
  emergencyFundMonths: number;
  debtToIncomeRatio: number;
  fixedExpenseRatio: number;
  variableExpenseRatio: number;

  incomeCadence: string | null;
  riskLevel: string;
  advisorSummary: string;
  profileJson: Record<string, unknown>;
}

function detectIncomeCadence(incomeTxns: Transaction[]): string | null {
  if (incomeTxns.length < 2) return null;

  const sorted = [...incomeTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const gaps: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const diff = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
    gaps.push(diff / (1000 * 60 * 60 * 24));
  }

  if (gaps.length === 0) return null;
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

  if (avgGap >= 25 && avgGap <= 35) return 'monthly';
  if (avgGap >= 13 && avgGap <= 16) return 'bi-weekly';
  if (avgGap >= 5 && avgGap <= 9) return 'weekly';
  return 'irregular';
}

function assessRiskLevel(profile: {
  savingsRateAvg: number;
  emergencyFundMonths: number;
  debtToIncomeRatio: number;
}): string {
  let risk = 0;

  if (profile.savingsRateAvg < 10) risk += 3;
  else if (profile.savingsRateAvg < 20) risk += 1;

  if (profile.emergencyFundMonths < 1) risk += 3;
  else if (profile.emergencyFundMonths < 3) risk += 1;

  if (profile.debtToIncomeRatio > 0.4) risk += 3;
  else if (profile.debtToIncomeRatio > 0.2) risk += 1;

  if (risk >= 5) return 'high';
  if (risk >= 2) return 'moderate';
  return 'conservative';
}

function buildSummary(profile: {
  monthlyIncomeAvg: number;
  monthlyExpenseAvg: number;
  savingsRateAvg: number;
  emergencyFundMonths: number;
  confidence: string;
}, txnCount: number, dateRangeDays: number | null): string {
  const parts: string[] = [];

  if (profile.confidence === 'low') {
    return `Insufficient data (${txnCount} transactions${dateRangeDays ? `, ${dateRangeDays} days` : ''}). Import more transactions or connect bank accounts for personalized advice.`;
  }

  parts.push(`Average monthly income: $${roundMoney(profile.monthlyIncomeAvg).toLocaleString()}`);
  parts.push(`Average monthly expenses: $${roundMoney(profile.monthlyExpenseAvg).toLocaleString()}`);
  parts.push(`Savings rate: ${roundMoney(profile.savingsRateAvg)}%`);
  parts.push(`Emergency fund coverage: ${profile.emergencyFundMonths} months`);

  if (profile.confidence === 'medium') {
    parts.push('(Based on limited data — answers may be less precise)');
  }

  return parts.join('. ');
}

export async function buildAdvisorProfile(userId: string): Promise<AdvisorProfileData> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [transactions, accounts, budgets, goals, holdings] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: sixMonthsAgo } },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.account.findMany({ where: { userId } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.holding.findMany({
      where: { portfolio: { userId } },
    }),
  ]);

  const txnCount = transactions.length;
  let dataStartDate: Date | null = null;
  let dataEndDate: Date | null = null;

  if (txnCount > 0) {
    dataStartDate = new Date(transactions[0].date);
    dataEndDate = new Date(transactions[transactions.length - 1].date);
  }

  const dateRangeDays = dataStartDate && dataEndDate
    ? Math.ceil((dataEndDate.getTime() - dataStartDate.getTime()) / 86400000)
    : 0;

  const incomeTxns = transactions.filter((t) => t.type === 'income');
  const expenseTxns = transactions.filter((t) => t.type === 'expense');

  const totalIncome = sumIncome(transactions);
  const totalExpenses = sumExpenses(transactions);

  const monthsOfData = Math.max(1, dateRangeDays / 30);
  const monthlyIncomeAvg = roundMoney(totalIncome / monthsOfData);
  const monthlyExpenseAvg = roundMoney(totalExpenses / monthsOfData);
  const savingsRateAvg = roundMoney(computeSavingsRate(totalIncome, totalExpenses));

  const totalAssets = computeTotalAssets(accounts);
  const totalLiabilities = computeTotalLiabilities(accounts);
  const savingsBalance = accounts
    .filter((a) => a.type === 'savings')
    .reduce((s, a) => s + a.balance, 0);

  const emergencyFundMonths = computeEmergencyFundMonths(savingsBalance, monthlyExpenseAvg);
  const debtToIncomeRatio = roundMoney(computeDebtToIncome(totalLiabilities, monthlyIncomeAvg));

  const { fixedRatio, variableRatio } = computeFixedVsVariableExpenses(transactions);
  const incomeCadence = detectIncomeCadence(incomeTxns);

  const categorized = transactions.filter((t) => t.category?.name !== 'Other');
  const categorizationQuality = txnCount > 0 ? (categorized.length / txnCount) * 100 : 0;

  const confidenceFactors: ConfidenceFactors = {
    transactionCount: txnCount,
    dateRangeDays,
    hasIncome: incomeTxns.length > 0,
    hasAccounts: accounts.length > 0,
    hasRecurringPatterns: incomeTxns.some((t) => t.isRecurring) || expenseTxns.some((t) => t.isRecurring),
    hasBudgets: budgets.length > 0,
    hasGoals: goals.length > 0,
    categorizationQuality,
  };

  const confidence = computeConfidence(confidenceFactors);

  const riskLevel = assessRiskLevel({
    savingsRateAvg,
    emergencyFundMonths,
    debtToIncomeRatio,
  });

  const advisorSummary = buildSummary(
    { monthlyIncomeAvg, monthlyExpenseAvg, savingsRateAvg, emergencyFundMonths, confidence },
    txnCount,
    dateRangeDays,
  );

  const profileJson: Record<string, unknown> = {
    accounts: accounts.map((a) => ({ name: a.name, type: a.type, balance: a.balance, currency: a.currency })),
    budgets: budgets.map((b) => ({
      category: (b as Budget & { category?: { name: string } }).category?.name || 'Unknown',
      amount: b.amount,
      spent: b.spent,
    })),
    goals: goals.map((g) => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount,
      deadline: g.deadline?.toISOString(),
    })),
    holdings: holdings.length,
    topMerchants: (() => {
      const merchantMap: Record<string, number> = {};
      for (const t of expenseTxns) {
        const m = t.merchant || t.description;
        merchantMap[m] = (merchantMap[m] || 0) + Math.abs(t.amount);
      }
      return Object.entries(merchantMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, amount]) => ({ name, amount: roundMoney(amount) }));
    })(),
    topCategories: (() => {
      const catMap: Record<string, number> = {};
      for (const t of expenseTxns) {
        const c = t.category?.name || 'Other';
        catMap[c] = (catMap[c] || 0) + Math.abs(t.amount);
      }
      return Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, amount]) => ({ name, amount: roundMoney(amount) }));
    })(),
    recurringCount: expenseTxns.filter((t) => t.isRecurring).length,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };

  const profileData: AdvisorProfileData = {
    dataStartDate,
    dataEndDate,
    transactionCount: txnCount,
    dataQualityScore: Math.round(confidenceFactors.categorizationQuality),
    confidence,
    monthlyIncomeAvg,
    monthlyExpenseAvg,
    savingsRateAvg,
    emergencyFundMonths,
    debtToIncomeRatio,
    fixedExpenseRatio: fixedRatio,
    variableExpenseRatio: variableRatio,
    incomeCadence,
    riskLevel,
    advisorSummary,
    profileJson,
  };

  await prisma.advisorProfile.upsert({
    where: { userId },
    create: { userId, ...profileData, profileJson: profileJson as unknown as Prisma.InputJsonValue },
    update: { ...profileData, profileJson: profileJson as unknown as Prisma.InputJsonValue },
  });

  return profileData;
}

export async function getAdvisorProfile(userId: string): Promise<AdvisorProfileData | null> {
  const existing = await prisma.advisorProfile.findUnique({ where: { userId } });
  if (!existing) return buildAdvisorProfile(userId);
  return existing as unknown as AdvisorProfileData;
}
