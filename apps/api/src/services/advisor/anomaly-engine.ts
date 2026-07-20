import { prisma } from '../../prisma';
import { roundMoney } from '../finance-math';

export interface Anomaly {
  type: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  transactionIds: string[];
  evidence: Record<string, unknown>;
}

export async function detectAnomalies(userId: string): Promise<Anomaly[]> {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, date: { gte: threeMonthsAgo } },
    include: { category: { select: { name: true } } },
    orderBy: { date: 'asc' },
  });

  const anomalies: Anomaly[] = [];

  const expenseTxns = transactions.filter((t) => t.type === 'expense');
  if (expenseTxns.length < 10) return anomalies;

  const amounts = expenseTxns.map((t) => Math.abs(t.amount));
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length);

  const outliers = expenseTxns.filter((t) => {
    const amt = Math.abs(t.amount);
    return stdDev > 0 && Math.abs(amt - mean) > 3 * stdDev;
  });

  if (outliers.length > 0) {
    anomalies.push({
      type: 'unusual_amount',
      title: `${outliers.length} unusual transaction amount(s) detected`,
      description: `These transactions are significantly higher than your average expense of $${roundMoney(mean)}.`,
      severity: 'medium',
      transactionIds: outliers.map((t) => t.id),
      evidence: { mean, stdDev, outlierCount: outliers.length },
    });
  }

  const byMerchant: Record<string, number[]> = {};
  for (const t of expenseTxns) {
    const m = (t.merchant || t.description || 'unknown').toLowerCase();
    if (!byMerchant[m]) byMerchant[m] = [];
    byMerchant[m].push(Math.abs(t.amount));
  }

  for (const [merchant, merchantAmounts] of Object.entries(byMerchant)) {
    if (merchantAmounts.length < 2) continue;
    const mMean = merchantAmounts.reduce((s, a) => s + a, 0) / merchantAmounts.length;
    const latest = merchantAmounts[merchantAmounts.length - 1];
    if (latest > mMean * 2) {
      anomalies.push({
        type: 'merchant_spike',
        title: `${merchant} charge unusually high`,
        description: `Latest charge of $${roundMoney(latest)} is significantly above your average of $${roundMoney(mMean)} at ${merchant}.`,
        severity: 'medium',
        transactionIds: [],
        evidence: { merchant, latest, average: mMean },
      });
    }
  }

  const byCategory: Record<string, number[]> = {};
  for (const t of expenseTxns) {
    const c = t.category?.name || 'Other';
    if (!byCategory[c]) byCategory[c] = [];
    byCategory[c].push(Math.abs(t.amount));
  }

  for (const [cat, catAmounts] of Object.entries(byCategory)) {
    if (catAmounts.length < 3) continue;
    const firstHalf = catAmounts.slice(0, Math.floor(catAmounts.length / 2));
    const secondHalf = catAmounts.slice(Math.floor(catAmounts.length / 2));
    const firstAvg = firstHalf.reduce((s, a) => s + a, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, a) => s + a, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.5) {
      anomalies.push({
        type: 'category_trend',
        title: `${cat} spending trending upward`,
        description: `Recent ${cat} spending ($${roundMoney(secondAvg)}/transaction) is up ${Math.round(((secondAvg - firstAvg) / firstAvg) * 100)}% from earlier.`,
        severity: 'low',
        transactionIds: [],
        evidence: { category: cat, earlierAvg: firstAvg, recentAvg: secondAvg },
      });
    }
  }

  return anomalies.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}
