import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { type Prisma } from '@prisma/client';
import { prisma } from '../prisma';

const router = Router();

const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']).default('USD'),
  description: z.string().min(1).max(255),
  merchant: z.string().max(255).optional(),
  categoryId: z.string(),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other']).default('other'),
  date: z.string(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'cleared', 'flagged']).default('cleared'),
  isRecurring: z.boolean().default(false),
});

const updateTransactionSchema = createTransactionSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
  type: z.enum(['income', 'expense']).optional(),
  categoryId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other']).optional(),
  sort: z.string().default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const SORT_FIELD_MAP: Record<string, string> = {
  date: 'date',
  amount: 'amount',
  merchant: 'merchant',
  description: 'description',
  createdAt: 'createdAt',
};

router.get('/', async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid query', details: parsed.error.format() });
  }

  const { page, limit, type, categoryId, startDate, endDate, search, paymentMethod, sort, order } = parsed.data;

  const where: Prisma.TransactionWhereInput = {
    userId: req.userId,
    ...(type && { type }),
    ...(categoryId && { categoryId }),
    ...(paymentMethod && { paymentMethod }),
    ...(startDate && { date: { gte: new Date(startDate) } }),
    ...(endDate && { date: { lte: new Date(endDate + 'T23:59:59.999Z') } }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { merchant: { contains: search, mode: 'insensitive' } },
        { amount: { equals: parseFloat(search) || undefined } },
      ],
    }),
  };

  const orderBy = { [SORT_FIELD_MAP[sort] || 'date']: order as 'asc' | 'desc' };

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ success: true, data: { data, total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get('/:id', async (req: Request, res: Response) => {
  const txn = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
  res.json({ success: true, data: txn });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const { date, ...rest } = parsed.data;
  const txn = await prisma.transaction.create({
    data: { ...rest, date: new Date(date), userId: req.userId },
  });

  res.status(201).json({ success: true, data: txn });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Transaction not found' });

  const parsed = updateTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const { date, ...rest } = parsed.data;
  const txn = await prisma.transaction.update({
    where: { id: req.params.id },
    data: { ...rest, ...(date && { date: new Date(date) }) },
  });

  res.json({ success: true, data: txn });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Transaction not found' });

  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Transaction deleted' });
});

router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
    });
    const validCatIds = new Set(categories.map((c) => c.id));
    const fallbackCat = categories.find((c) => c.name === 'Other') || categories[0];

    const data = items.map((item: Record<string, unknown>) => ({
      userId: req.userId,
      type: (item.type || 'expense') as 'income' | 'expense',
      amount: item.amount as number,
      currency: (item.currency || 'USD') as 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'CAD' | 'AUD',
      description: item.description as string,
      merchant: (item.merchant as string) || null,
      categoryId: (validCatIds.has(item.categoryId as string) ? item.categoryId : fallbackCat?.id) as string,
      paymentMethod: (item.paymentMethod || 'other') as 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'other',
      date: new Date(item.date as string),
      notes: (item.notes as string) || null,
      status: (item.status || 'cleared') as 'pending' | 'cleared' | 'flagged',
      isRecurring: (item.isRecurring as boolean) || false,
    }));

    const result = await prisma.transaction.createMany({ data });
    const created = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: result.count,
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create transactions' });
  }
});

router.delete('/bulk', async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'ids array is required' });
  }

  const result = await prisma.transaction.deleteMany({
    where: { id: { in: ids }, userId: req.userId },
  });

  res.json({ success: true, message: `${result.count} transaction(s) deleted` });
});

export default router;
