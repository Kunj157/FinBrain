import { type Budget } from '@prisma/client';
import { prisma } from '../prisma';
import { roundMoney } from './finance-math';

type TxnWithCategory = {
  id: string;
  amount: number;
  categoryId: string;
  date: Date;
  category: { name: string; id: string } | null;
};

export interface BudgetSuggestion {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  basedOnAverage: number;
  basedOnMonths: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export async function suggestBudgets(userId: string): Promise<BudgetSuggestion[]> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions: TxnWithCategory[] = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, type: 'expense', date: { gte: threeMonthsAgo } },
    include: { category: { select: { name: true, id: true } } },
  }) as TxnWithCategory[];

  const categories = await prisma.category.findMany({ where: { userId } });

  const catMonths: Record<string, { total: number; months: number; amounts: number[] }> = {};
  for (const t of transactions) {
    const catId = t.categoryId;
    const catName = t.category?.name || 'Other';
    const monthKey = `${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;

    if (!catMonths[catId]) {
      catMonths[catId] = { total: 0, months: 0, amounts: [] };
    }
    catMonths[catId].total += Math.abs(t.amount);
    catMonths[catId].amounts.push(Math.abs(t.amount));
  }

  const monthsInPeriod = 3;

  for (const catId of Object.keys(catMonths)) {
    const monthSet = new Set(
      transactions
        .filter((t) => t.categoryId === catId)
        .map((t) => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${d.getMonth()}`;
        })
    );
    catMonths[catId].months = monthSet.size || 1;
  }

  const existingBudgets = await prisma.budget.findMany({
    where: { userId },
    select: { categoryId: true },
  });
  const existingCatIds = new Set(existingBudgets.map((b) => b.categoryId));

  const suggestions: BudgetSuggestion[] = [];

  for (const [catId, data] of Object.entries(catMonths)) {
    if (existingCatIds.has(catId)) continue;

    const avg = data.total / data.months;
    const sortedAmounts = [...data.amounts].sort((a, b) => a - b);
    const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)] || avg;

    const suggestedAmount = roundMoney(median * 1.1);

    const cat = categories.find((c) => c.id === catId);
    const catName = cat?.name || 'Other';

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (data.months >= 3 && data.amounts.length >= 6) confidence = 'high';
    else if (data.months >= 2 && data.amounts.length >= 3) confidence = 'medium';

    let reason: string;
    if (confidence === 'high') {
      reason = `Based on ${data.months} months of data (${data.amounts.length} transactions)`;
    } else if (confidence === 'medium') {
      reason = `Based on ${data.months} months of data — amount may vary`;
    } else {
      reason = `Limited data (${data.amounts.length} transactions) — review before setting`;
    }

    suggestions.push({
      categoryId: catId,
      categoryName: catName,
      suggestedAmount,
      basedOnAverage: roundMoney(avg),
      basedOnMonths: data.months,
      confidence,
      reason,
    });
  }

  return suggestions.sort((a, b) => b.basedOnAverage - a.basedOnAverage);
}

export async function autoSuggestBudgets(userId: string): Promise<Budget[]> {
  const suggestions = await suggestBudgets(userId);
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const created: Budget[] = [];

  for (const s of suggestions) {
    const existing = await prisma.budget.findFirst({
      where: { userId, categoryId: s.categoryId, startDate },
    });
    if (existing) continue;

    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: s.categoryId,
        amount: s.suggestedAmount,
        startDate,
        spent: 0,
        autoSuggested: true,
        budgetMode: 'category',
      },
    });
    created.push(budget);
  }

  return created;
}

export async function detectFlexCategories(userId: string): Promise<{
  fixed: Array<{ categoryId: string; name: string; avgAmount: number }>;
  flexible: Array<{ categoryId: string; name: string; avgAmount: number }>;
  nonMonthly: Array<{ categoryId: string; name: string; avgAmount: number }>;
}> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, type: 'expense', date: { gte: threeMonthsAgo } },
    include: { category: { select: { name: true, id: true } } },
  });

  const categories = await prisma.category.findMany({ where: { userId } });

  const catTxns: Record<string, TxnWithCategory[]> = {};
  for (const t of transactions) {
    if (!catTxns[t.categoryId]) catTxns[t.categoryId] = [];
    catTxns[t.categoryId].push(t);
  }

  const fixed: Array<{ categoryId: string; name: string; avgAmount: number }> = [];
  const flexible: Array<{ categoryId: string; name: string; avgAmount: number }> = [];
  const nonMonthly: Array<{ categoryId: string; name: string; avgAmount: number }> = [];

  for (const [catId, txns] of Object.entries(catTxns)) {
    if (txns.length < 2) continue;

    const amounts = txns.map((t) => Math.abs(t.amount));
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

    const months = new Set(
      txns.map((t) => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    ).size;

    const cat = categories.find((c) => c.id === catId);
    const catName = cat?.name || 'Other';
    const avg = roundMoney(mean);

    if (months <= 1 && txns.length <= 2) {
      nonMonthly.push({ categoryId: catId, name: catName, avgAmount: avg });
    } else if (cv < 0.2) {
      fixed.push({ categoryId: catId, name: catName, avgAmount: avg });
    } else {
      flexible.push({ categoryId: catId, name: catName, avgAmount: avg });
    }
  }

  return { fixed, flexible, nonMonthly };
}
