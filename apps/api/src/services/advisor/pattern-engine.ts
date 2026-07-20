import { type Prisma, type Transaction } from '@prisma/client';
import { prisma } from '../../prisma';
import { roundMoney } from '../finance-math';

export interface SpendingPatternData {
  merchant: string | null;
  categoryId: string | null;
  patternType: string;
  cadence: string | null;
  avgAmount: number;
  minAmount: number | null;
  maxAmount: number | null;
  monthAvg: number | null;
  volatility: number | null;
  confidence: number;
  sampleSize: number;
  lastSeenAt: Date | null;
  metadata: Record<string, unknown>;
}

function groupByMerchant(transactions: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = (t.merchant || t.description || 'unknown').toLowerCase().trim();
    const list = groups.get(key) || [];
    list.push(t);
    groups.set(key, list);
  }
  return groups;
}

function detectCadence(txns: Transaction[]): string | null {
  if (txns.length < 2) return null;

  const sorted = [...txns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const gaps: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const diff = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
    gaps.push(diff / (1000 * 60 * 60 * 24));
  }

  if (gaps.length === 0) return null;
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

  if (avgGap >= 5 && avgGap <= 9) return 'weekly';
  if (avgGap >= 13 && avgGap <= 16) return 'bi-weekly';
  if (avgGap >= 25 && avgGap <= 35) return 'monthly';
  if (avgGap >= 55 && avgGap <= 70) return 'quarterly';
  if (avgGap >= 350 && avgGap <= 380) return 'yearly';
  return 'irregular';
}

function computeVolatility(amounts: number[]): number {
  if (amounts.length < 2) return 0;
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
  return mean > 0 ? Math.round(Math.sqrt(variance) / mean * 10000) / 100 : 0;
}

export async function buildSpendingPatterns(userId: string): Promise<SpendingPatternData[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, date: { gte: sixMonthsAgo } },
    orderBy: { date: 'asc' },
  });

  const merchantGroups = groupByMerchant(transactions);
  const patterns: SpendingPatternData[] = [];

  for (const [merchant, txns] of merchantGroups) {
    if (txns.length < 2) continue;

    const amounts = txns.map((t) => Math.abs(t.amount));
    const avgAmount = roundMoney(amounts.reduce((s, a) => s + a, 0) / amounts.length);
    const cadence = detectCadence(txns);
    const volatility = computeVolatility(amounts);

    const categories = txns.map((t) => t.categoryId).filter(Boolean);
    const mostCommonCategory = categories.length > 0
      ? categories.sort((a, b) =>
        categories.filter((v) => v === a).length - categories.filter((v) => v === b).length
      ).pop()!
      : null;

    const recentMonths = txns.filter((t) => {
      const d = new Date(t.date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return d >= threeMonthsAgo;
    });
    const monthAvg = recentMonths.length > 0
      ? roundMoney(recentMonths.reduce((s, t) => s + Math.abs(t.amount), 0) / 3)
      : avgAmount;

    const confidence = Math.min(1, txns.length / 6) * (1 - volatility / 100);

    patterns.push({
      merchant,
      categoryId: mostCommonCategory,
      patternType: 'recurring',
      cadence,
      avgAmount,
      minAmount: roundMoney(Math.min(...amounts)),
      maxAmount: roundMoney(Math.max(...amounts)),
      monthAvg,
      volatility,
      confidence: Math.round(confidence * 100) / 100,
      sampleSize: txns.length,
      lastSeenAt: new Date(txns[txns.length - 1].date),
      metadata: {
        firstSeen: txns[0].date,
        totalSpent: roundMoney(amounts.reduce((s, a) => s + a, 0)),
        isRecurring: txns.some((t) => t.isRecurring),
      },
    });
  }

  await prisma.spendingPattern.deleteMany({ where: { userId } });

  if (patterns.length > 0) {
    await prisma.spendingPattern.createMany({
      data: patterns.map((p) => ({
        userId,
        merchant: p.merchant,
        categoryId: p.categoryId,
        patternType: p.patternType,
        cadence: p.cadence,
        avgAmount: p.avgAmount,
        minAmount: p.minAmount,
        maxAmount: p.maxAmount,
        monthAvg: p.monthAvg,
        volatility: p.volatility,
        confidence: p.confidence,
        sampleSize: p.sampleSize,
        lastSeenAt: p.lastSeenAt,
        metadata: p.metadata as unknown as Prisma.InputJsonValue,
      })),
    });
  }

  return patterns;
}

export async function getSpendingPatterns(userId: string): Promise<SpendingPatternData[]> {
  const existing = await prisma.spendingPattern.findMany({
    where: { userId },
    orderBy: { avgAmount: 'desc' },
  });
  if (existing.length === 0) return buildSpendingPatterns(userId);
  return existing as unknown as SpendingPatternData[];
}
