import { type Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { roundMoney } from '../finance-math';

export interface InsightData {
  type: string;
  title: string;
  summary: string;
  severity: 'info' | 'warning' | 'critical' | 'positive';
  priority: number;
  evidence: Record<string, unknown>[];
  actions: string[];
}

export async function generateInsights(userId: string): Promise<InsightData[]> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [thisMonthTxns, lastMonthTxns, budgets, goals, profile] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: thisMonthStart } },
      include: { category: { select: { name: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      include: { category: { select: { name: true } } },
    }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.advisorProfile.findUnique({ where: { userId } }),
  ]);

  const insights: InsightData[] = [];

  const thisMonthExpenses = thisMonthTxns.filter((t) => t.type === 'expense');
  const lastMonthExpenses = lastMonthTxns.filter((t) => t.type === 'expense');

  const thisTotal = thisMonthExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastTotal = lastMonthExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);

  if (lastTotal > 0 && thisTotal > lastTotal * 1.2) {
    const increase = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
    insights.push({
      type: 'spending_increase',
      title: `Spending up ${increase}% vs last month`,
      summary: `You've spent $${roundMoney(thisTotal)} so far this month, compared to $${roundMoney(lastTotal)} last month. Monitor your remaining budget closely.`,
      severity: 'warning',
      priority: 8,
      evidence: [{ thisMonth: thisTotal, lastMonth: lastTotal, increase }],
      actions: ['Review your top spending categories', 'Check budget utilization'],
    });
  }

  const catMapThis: Record<string, number> = {};
  const catMapLast: Record<string, number> = {};
  for (const t of thisMonthExpenses) {
    const c = t.category?.name || 'Other';
    catMapThis[c] = (catMapThis[c] || 0) + Math.abs(t.amount);
  }
  for (const t of lastMonthExpenses) {
    const c = t.category?.name || 'Other';
    catMapLast[c] = (catMapLast[c] || 0) + Math.abs(t.amount);
  }

  for (const [cat, thisAmt] of Object.entries(catMapThis)) {
    const lastAmt = catMapLast[cat] || 0;
    if (lastAmt > 0 && thisAmt > lastAmt * 1.5) {
      const increase = Math.round(((thisAmt - lastAmt) / lastAmt) * 100);
      insights.push({
        type: 'category_spike',
        title: `${cat} spending up ${increase}%`,
        summary: `Spending on ${cat} jumped from $${roundMoney(lastAmt)} to $${roundMoney(thisAmt)} this month.`,
        severity: 'warning',
        priority: 7,
        evidence: [{ category: cat, thisMonth: thisAmt, lastMonth: lastAmt }],
        actions: [`Review ${cat} transactions`, 'Consider setting a budget for this category'],
      });
    }
  }

  for (const budget of budgets) {
    const catName = budget.category?.name || 'Unknown';
    const spent = catMapThis[catName] || 0;
    const utilization = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    if (utilization >= 100) {
      insights.push({
        type: 'budget_exceeded',
        title: `${catName} budget exceeded`,
        summary: `You've spent $${roundMoney(spent)} of your $${budget.amount} ${catName} budget (${Math.round(utilization)}%).`,
        severity: 'critical',
        priority: 9,
        evidence: [{ category: catName, budget: budget.amount, spent, utilization }],
        actions: [`Reduce ${catName} spending`, 'Consider increasing next month\'s budget'],
      });
    } else if (utilization >= 80) {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dayOfMonth = now.getDate();
      const daysLeft = daysInMonth - dayOfMonth;

      if (daysLeft > 5) {
        insights.push({
          type: 'budget_warning',
          title: `${catName} budget at ${Math.round(utilization)}%`,
          summary: `You've used ${Math.round(utilization)}% of your ${catName} budget with ${daysLeft} days left in the month.`,
          severity: 'warning',
          priority: 6,
          evidence: [{ category: catName, budget: budget.amount, spent, daysLeft }],
          actions: [`Slow down ${catName} spending`, `Aim to spend $${roundMoney(budget.amount - spent)} or less for the rest of the month`],
        });
      }
    }
  }

  if (profile && profile.confidence === 'low') {
    insights.push({
      type: 'data_quality',
      title: 'More data needed for accurate advice',
      summary: 'Your advisor confidence is low. Import more transactions or connect bank accounts for personalized insights.',
      severity: 'info',
      priority: 3,
      evidence: [{ transactionCount: profile.transactionCount }],
      actions: ['Connect bank accounts via Plaid', 'Import CSV/PDF bank statements'],
    });
  }

  for (const goal of goals) {
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    if (goal.deadline) {
      const daysLeft = Math.ceil((goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 30 && progress < 80) {
        insights.push({
          type: 'goal_off_track',
          title: `"${goal.name}" goal may miss deadline`,
          summary: `You're ${Math.round(progress)}% toward "${goal.name}" with ${daysLeft} days left. Consider increasing contributions.`,
          severity: 'warning',
          priority: 7,
          evidence: [{ goalId: goal.id, progress, daysLeft, target: goal.targetAmount, current: goal.currentAmount }],
          actions: [`Increase monthly contribution to "${goal.name}"`, 'Adjust deadline if needed'],
        });
      }
    }
  }

  const unreviewedCount = await prisma.transaction.count({
    where: { userId, deletedAt: null, needsReview: true },
  });
  if (unreviewedCount > 0) {
    insights.push({
      type: 'unreviewed_backlog',
      title: `${unreviewedCount} transaction(s) need review`,
      summary: 'Some transactions have been flagged for review. Categorizing them improves advisor accuracy.',
      severity: 'info',
      priority: 2,
      evidence: [{ count: unreviewedCount }],
      actions: ['Review flagged transactions'],
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}

export async function storeInsights(userId: string, insights: InsightData[]): Promise<void> {
  await prisma.advisorInsight.deleteMany({ where: { userId, status: 'active' } });

  if (insights.length > 0) {
    await prisma.advisorInsight.createMany({
      data: insights.map((i) => ({
        userId,
        type: i.type,
        title: i.title,
        summary: i.summary,
        severity: i.severity,
        priority: i.priority,
        evidence: i.evidence as unknown as Prisma.InputJsonValue,
        actions: i.actions as unknown as Prisma.InputJsonValue,
      })),
    });
  }
}

export async function getStoredInsights(userId: string) {
  return prisma.advisorInsight.findMany({
    where: { userId, status: 'active' },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function dismissInsight(userId: string, insightId: string) {
  return prisma.advisorInsight.updateMany({
    where: { id: insightId, userId },
    data: { status: 'dismissed' },
  });
}
