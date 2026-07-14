import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'credit', 'loan', 'investment', 'real_estate', 'other']),
  balance: z.number().default(0),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']).default('USD'),
  institution: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
});

const updateAccountSchema = createAccountSchema.partial();

router.get('/', async (req: Request, res: Response) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: accounts });
});

router.get('/net-worth', async (req: Request, res: Response) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.userId },
  });

  const assets = accounts.filter((a) =>
    ['checking', 'savings', 'investment', 'real_estate'].includes(a.type)
  );
  const liabilities = accounts.filter((a) =>
    ['credit', 'loan'].includes(a.type)
  );

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);

  res.json({
    success: true,
    data: {
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: a.balance,
        currency: a.currency,
      })),
    },
  });
});

router.get('/net-worth/history', async (req: Request, res: Response) => {
  const months = Math.min(Math.max(parseInt(req.query.months as string) || 12, 1), 60);

  const accounts = await prisma.account.findMany({ where: { userId: req.userId } });
  const currentNetWorth = accounts
    .filter((a) => ['checking', 'savings', 'investment', 'real_estate'].includes(a.type))
    .reduce((s, a) => s + a.balance, 0) -
    accounts
      .filter((a) => ['credit', 'loan'].includes(a.type))
      .reduce((s, a) => s + a.balance, 0);

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.userId,
      deletedAt: null,
      date: { gte: startDate },
    },
    select: { type: true, amount: true, date: true },
  });

  const monthlyDelta: Record<string, number> = {};
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyDelta[key] = 0;
  }

  for (const txn of transactions) {
    const d = txn.date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyDelta[key] !== undefined) {
      monthlyDelta[key] += txn.type === 'income' ? txn.amount : -txn.amount;
    }
  }

  const sortedKeys = Object.keys(monthlyDelta).sort();
  const history: { month: string; netWorth: number }[] = [];
  let running = currentNetWorth;

  for (let i = sortedKeys.length - 1; i >= 0; i--) {
    running -= monthlyDelta[sortedKeys[i]];
  }

  for (const key of sortedKeys) {
    running += monthlyDelta[key];
    history.push({ month: key, netWorth: Math.round(running * 100) / 100 });
  }

  res.json({ success: true, data: history });
});

router.get('/:id', async (req: Request, res: Response) => {
  const account = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { transactions: { take: 20, orderBy: { date: 'desc' } } },
  });
  if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
  res.json({ success: true, data: account });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const account = await prisma.account.create({
    data: { ...parsed.data, userId: req.userId },
  });

  res.status(201).json({ success: true, data: account });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Account not found' });

  const parsed = updateAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const account = await prisma.account.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json({ success: true, data: account });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Account not found' });

  await prisma.account.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Account deleted' });
});

export default router;
