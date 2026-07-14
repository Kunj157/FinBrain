import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) {
    return res.json({ success: true, data: { transactions: [], categories: [], accounts: [], budgets: [], goals: [] } });
  }

  const limit = 5;
  const pattern = { contains: q, mode: 'insensitive' as const };

  const [transactions, categories, accounts, budgets, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: req.userId,
        deletedAt: null,
        OR: [
          { description: pattern },
          { merchant: pattern },
          { amount: { equals: parseFloat(q) || undefined } },
        ],
      },
      take: limit,
      orderBy: { date: 'desc' },
      include: { category: { select: { name: true, color: true } } },
    }),
    prisma.category.findMany({
      where: { userId: req.userId, name: pattern },
      take: limit,
    }),
    prisma.account.findMany({
      where: {
        userId: req.userId,
        OR: [
          { name: pattern },
          { institution: pattern },
        ],
      },
      take: limit,
    }),
    prisma.budget.findMany({
      where: {
        userId: req.userId,
        category: { name: pattern },
      },
      take: limit,
      include: { category: { select: { name: true, color: true } } },
    }),
    prisma.goal.findMany({
      where: {
        userId: req.userId,
        OR: [
          { name: pattern },
          { goalType: pattern },
        ],
      },
      take: limit,
    }),
  ]);

  res.json({
    success: true,
    data: {
      transactions: transactions.map((t) => ({
        id: t.id,
        label: t.merchant || t.description,
        sublabel: `${t.category?.name || 'Other'} · ${t.date.toISOString().split('T')[0]}`,
        amount: t.amount,
        type: t.type,
        navigateTo: '/transactions',
      })),
      categories: categories.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.isCustom ? 'Custom' : 'Default',
        color: c.color,
        navigateTo: '/categories',
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        label: a.name,
        sublabel: `${a.type.replace('_', ' ')}${a.institution ? ` · ${a.institution}` : ''}`,
        amount: a.balance,
        navigateTo: '/accounts',
      })),
      budgets: budgets.map((b) => ({
        id: b.id,
        label: b.category?.name || 'Budget',
        sublabel: `${b.period} · ${b.amount}`,
        amount: b.spent,
        navigateTo: '/budgets',
      })),
      goals: goals.map((g) => ({
        id: g.id,
        label: g.name,
        sublabel: `${g.goalType} · ${g.currentAmount}/${g.targetAmount}`,
        navigateTo: '/goals',
      })),
    },
  });
});

export default router;
