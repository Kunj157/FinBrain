import type { prisma as PrismaClientInstance } from '../prisma';

export type ReportType = 'monthly' | 'quarterly' | 'annual';

export interface ReportSummary {
  period: { start: string; end: string };
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionCount: number;
  topCategories: { name: string; amount: number }[];
}

type Db = Pick<typeof PrismaClientInstance, 'transaction'>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The window a report covers, ending today. Shared by the preview and the emailed copy. */
export function reportPeriod(type: ReportType, now: Date): { start: Date; end: Date } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  if (type === 'monthly') return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end };
  if (type === 'quarterly') return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end };
  return { start: new Date(now.getFullYear() - 1, 0, 1), end };
}

/** Pure aggregation, kept apart from the query so it can be tested without a database. */
export function summarizeTransactions(
  transactions: { type: string; amount: number; category?: { name: string } | null }[],
  start: Date,
  end: Date,
): ReportSummary {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

  const byCategory: Record<string, number> = {};
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    const cat = t.category?.name || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
  }

  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, amount]) => ({ name, amount: round2(amount) }));

  return {
    period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
    totalIncome: round2(income),
    totalExpenses: round2(expenses),
    netCashFlow: round2(income - expenses),
    transactionCount: transactions.length,
    topCategories,
  };
}

export async function buildReport(
  db: Db,
  userId: string,
  type: ReportType,
  now: Date = new Date(),
): Promise<ReportSummary> {
  const { start, end } = reportPeriod(type, now);
  const transactions = await db.transaction.findMany({
    where: { userId, deletedAt: null, date: { gte: start, lte: end } },
    include: { category: { select: { name: true } } },
  });
  return summarizeTransactions(transactions, start, end);
}
