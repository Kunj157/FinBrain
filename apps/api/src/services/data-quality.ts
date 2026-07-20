import { type Transaction, type Account, type Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getTransactionAmountAbs } from './finance-math';

export interface DataQualityIssue {
  type: 'duplicate' | 'missing_category' | 'unknown_merchant' | 'suspicious_amount' | 'stale_account' | 'uncategorized';
  severity: 'high' | 'medium' | 'low';
  description: string;
  transactionIds?: string[];
  accountId?: string;
  count: number;
}

export interface DataQualitySummary {
  overallScore: number;
  transactionCount: number;
  dateRangeDays: number | null;
  categorizedPercent: number;
  issues: DataQualityIssue[];
  recommendations: string[];
}

export async function detectDuplicateTransactions(userId: string): Promise<DataQualityIssue> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    orderBy: { date: 'asc' },
  });

  const duplicates: string[] = [];
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const a = transactions[i];
      const b = transactions[j];
      const sameAmount = getTransactionAmountAbs(a) === getTransactionAmountAbs(b);
      const sameType = a.type === b.type;
      const sameMerchant = (a.merchant || '').toLowerCase() === (b.merchant || '').toLowerCase() && (a.merchant || '') !== '';
      const dateDiff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime());
      const sameDay = dateDiff < 86400000;

      if (sameAmount && sameType && sameMerchant && sameDay) {
        duplicates.push(b.id);
      }
    }
  }

  const uniqueDuplicates = [...new Set(duplicates)];
  return {
    type: 'duplicate',
    severity: uniqueDuplicates.length > 0 ? 'high' : 'low',
    description: uniqueDuplicates.length > 0
      ? `Found ${uniqueDuplicates.length} potential duplicate transaction(s)`
      : 'No duplicate transactions detected',
    transactionIds: uniqueDuplicates,
    count: uniqueDuplicates.length,
  };
}

export async function detectMissingCategories(userId: string): Promise<DataQualityIssue> {
  const uncategorized = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      category: { name: 'Other' },
    },
  });

  return {
    type: 'missing_category',
    severity: uncategorized.length > 0 ? 'medium' : 'low',
    description: uncategorized.length > 0
      ? `${uncategorized.length} transaction(s) are in "Other" category — review and categorize for better advisor accuracy`
      : 'All transactions are categorized',
    transactionIds: uncategorized.map((t) => t.id),
    count: uncategorized.length,
  };
}

export async function detectSuspiciousAmounts(userId: string): Promise<DataQualityIssue> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    orderBy: { date: 'asc' },
  });

  if (transactions.length < 10) {
    return { type: 'suspicious_amount', severity: 'low', description: 'Not enough data to detect suspicious amounts', count: 0 };
  }

  const amounts = transactions.map((t) => getTransactionAmountAbs(t));
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length);

  const suspicious = transactions.filter((t) => {
    const amt = getTransactionAmountAbs(t);
    return stdDev > 0 && Math.abs(amt - mean) > 4 * stdDev;
  });

  return {
    type: 'suspicious_amount',
    severity: suspicious.length > 0 ? 'medium' : 'low',
    description: suspicious.length > 0
      ? `${suspicious.length} transaction(s) have amounts far from your usual range — verify they are correct`
      : 'No suspicious amounts detected',
    transactionIds: suspicious.map((t) => t.id),
    count: suspicious.length,
  };
}

export async function detectStaleAccounts(userId: string): Promise<DataQualityIssue> {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const staleAccounts = accounts.filter((a) => {
    const recentTxn = prisma.transaction.findFirst({
      where: { userId, accountId: a.id, deletedAt: null, date: { gte: thirtyDaysAgo } },
    });
    return !recentTxn;
  });

  const staleIds: string[] = [];
  for (const a of staleAccounts) {
    const recentTxn = await prisma.transaction.findFirst({
      where: { userId, accountId: a.id, deletedAt: null, date: { gte: thirtyDaysAgo } },
    });
    if (!recentTxn) staleIds.push(a.id);
  }

  return {
    type: 'stale_account',
    severity: staleIds.length > 0 ? 'medium' : 'low',
    description: staleIds.length > 0
      ? `${staleIds.length} account(s) have no recent transactions — sync or refresh for accurate advice`
      : 'All accounts have recent activity',
    count: staleIds.length,
  };
}

export async function computeDataQualityScore(userId: string): Promise<{
  score: number;
  confidence: 'low' | 'medium' | 'high';
  summary: DataQualitySummary;
}> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, date: true, categoryId: true, category: { select: { name: true } } },
  });

  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
  });

  const txnCount = transactions.length;

  let dateRangeDays: number | null = null;
  if (txnCount >= 2) {
    const dates = transactions.map((t) => new Date(t.date).getTime());
    dateRangeDays = Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000);
  }

  const categorized = transactions.filter((t) => t.category?.name !== 'Other');
  const categorizedPercent = txnCount > 0 ? (categorized.length / txnCount) * 100 : 0;

  const issues = await Promise.all([
    detectDuplicateTransactions(userId),
    detectMissingCategories(userId),
    detectSuspiciousAmounts(userId),
    detectStaleAccounts(userId),
  ]);

  const highIssues = issues.filter((i) => i.severity === 'high').length;
  const mediumIssues = issues.filter((i) => i.severity === 'medium').length;

  let score = 100;
  if (txnCount < 30) score -= 30;
  else if (txnCount < 60) score -= 15;

  if (!dateRangeDays || dateRangeDays < 45) score -= 25;
  else if (dateRangeDays < 90) score -= 10;

  if (categorizedPercent < 80) score -= 15;

  score -= highIssues * 10;
  score -= mediumIssues * 5;

  if (accounts.length === 0) score -= 10;

  score = Math.max(0, Math.min(100, score));

  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (txnCount >= 90 && dateRangeDays && dateRangeDays >= 90) confidence = 'high';
  else if (txnCount >= 30 && dateRangeDays && dateRangeDays >= 45) confidence = 'medium';

  const recommendations: string[] = [];
  if (txnCount < 30) recommendations.push('Import more transactions for better advisor accuracy');
  if (!dateRangeDays || dateRangeDays < 90) recommendations.push('At least 90 days of data recommended for reliable advice');
  if (categorizedPercent < 80) recommendations.push('Review and categorize transactions marked as "Other"');
  if (accounts.length === 0) recommendations.push('Connect bank accounts for balance-aware advice');
  if (highIssues > 0) recommendations.push('Review flagged duplicate transactions');

  return {
    score,
    confidence,
    summary: {
      overallScore: score,
      transactionCount: txnCount,
      dateRangeDays,
      categorizedPercent: Math.round(categorizedPercent * 100) / 100,
      issues,
      recommendations,
    },
  };
}
