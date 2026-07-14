import { prisma } from '../prisma';
import { type Prisma } from '@prisma/client';

export interface RecurringPattern {
  id: string;
  merchant: string;
  description: string;
  amount: number;
  avgAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  nextExpectedDate: string;
  lastDate: string;
  transactionCount: number;
  totalSpent: number;
  monthlyCost: number;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  transactions: { id: string; date: string; amount: number }[];
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

type TxnInput = { id: string; date: Date; amount: number; merchant: string | null; description: string; categoryId: string; category?: { name: string; color: string } | null };

function groupTransactions(
  transactions: TxnInput[],
): Map<string, TxnInput[]> {
  const groups = new Map<string, TxnInput[]>();
  const used = new Set<number>();

  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    const group = [sorted[i]];
    used.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const a = sorted[i];
      const b = sorted[j];

      const merchantMatch = similarity(a.merchant || '', b.merchant || '') >= 0.75;
      const descMatch = similarity(a.description, b.description) >= 0.7;
      const amountMatch = Math.abs(a.amount - b.amount) / Math.max(a.amount, 1) <= 0.1;

      if ((merchantMatch || descMatch) && amountMatch) {
        group.push(b);
        used.add(j);
      }
    }

    if (group.length >= 2) {
      const key = `${group[0].merchant || group[0].description}_${group[0].categoryId}`;
      groups.set(key, group);
    }
  }

  return groups;
}

function detectFrequency(dates: Date[]): RecurringPattern['frequency'] {
  if (dates.length < 2) return 'monthly';

  const sorted = dates.map(d => d.getTime()).sort((a, b) => a - b);
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i] - sorted[i - 1]);
  }

  const avgMs = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  const avgDays = avgMs / (1000 * 60 * 60 * 24);

  if (avgDays >= 3 && avgDays <= 10) return 'weekly';
  if (avgDays >= 11 && avgDays <= 18) return 'biweekly';
  if (avgDays >= 24 && avgDays <= 38) return 'monthly';
  if (avgDays >= 80 && avgDays <= 100) return 'quarterly';
  if (avgDays >= 340 && avgDays <= 390) return 'yearly';

  if (avgDays < 24) return 'biweekly';
  if (avgDays < 80) return 'monthly';
  return 'quarterly';
}

function calcNextDate(lastDate: Date, frequency: RecurringPattern['frequency']): Date {
  const d = new Date(lastDate);
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

function monthlyCostEstimate(avgAmount: number, frequency: RecurringPattern['frequency']): number {
  switch (frequency) {
    case 'weekly': return avgAmount * 4.33;
    case 'biweekly': return avgAmount * 2.17;
    case 'monthly': return avgAmount;
    case 'quarterly': return avgAmount / 3;
    case 'yearly': return avgAmount / 12;
  }
}

export async function detectRecurring(userId: string): Promise<RecurringPattern[]> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 6);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'expense',
      deletedAt: null,
      date: { gte: threeMonthsAgo },
    },
    orderBy: { date: 'asc' },
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  const groups = groupTransactions(transactions);
  const patterns: RecurringPattern[] = [];

  for (const [key, txns] of groups) {
    const sorted = txns.sort((a, b) => a.date.getTime() - b.date.getTime());
    const frequency = detectFrequency(sorted.map(t => t.date));
    const avgAmount = txns.reduce((s, t) => s + t.amount, 0) / txns.length;
    const lastTxn = sorted[sorted.length - 1];
    const nextDate = calcNextDate(lastTxn.date, frequency);
    const mCost = monthlyCostEstimate(avgAmount, frequency);

    patterns.push({
      id: key,
      merchant: lastTxn.merchant || lastTxn.description.slice(0, 50),
      description: lastTxn.description,
      amount: lastTxn.amount,
      avgAmount: Math.round(avgAmount * 100) / 100,
      frequency,
      nextExpectedDate: nextDate.toISOString().split('T')[0],
      lastDate: lastTxn.date.toISOString().split('T')[0],
      transactionCount: txns.length,
      totalSpent: Math.round(txns.reduce((s, t) => s + t.amount, 0) * 100) / 100,
      monthlyCost: Math.round(mCost * 100) / 100,
      categoryId: lastTxn.categoryId,
      categoryName: lastTxn.category?.name || 'Other',
      categoryColor: lastTxn.category?.color || '#6b7280',
      transactions: sorted.map(t => ({
        id: t.id,
        date: t.date.toISOString().split('T')[0],
        amount: t.amount,
      })),
    });
  }

  patterns.sort((a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime());

  return patterns;
}
