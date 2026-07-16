import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { type Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { trainFromUserCorrection, suggestCategoryWithML } from '../services/auto-categorize';

const router = Router();

const AUDIT_ENTITY = 'transaction';

async function audit(userId: string, action: string, entityId: string | null, details: Record<string, unknown> | null) {
  await prisma.auditLog.create({
    data: { action, entity: AUDIT_ENTITY, entityId, details: details as unknown as Prisma.InputJsonValue, userId },
  }).catch(() => {});
}

const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']).default('USD'),
  description: z.string().min(1).max(255),
  merchant: z.string().max(255).optional(),
  categoryId: z.string(),
  accountId: z.string().optional(),
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
  deleted: z.coerce.boolean().default(false),
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

  const { page, limit, type, categoryId, startDate, endDate, search, paymentMethod, sort, order, deleted } = parsed.data;

  const where: Prisma.TransactionWhereInput = {
    userId: req.userId,
    deletedAt: deleted ? { not: null } : null,
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
    prisma.transaction.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tags: { include: { tag: true } },
        splits: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ success: true, data: { data, total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get('/:id', async (req: Request, res: Response) => {
  const txn = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      splits: true,
    },
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
  let categoryId = parsed.data.categoryId;

  const validCat = await prisma.category.findFirst({ where: { id: categoryId, userId: req.userId } });
  if (!validCat) {
    const suggestion = await suggestCategoryWithML(req.userId, rest.merchant || '', rest.description);
    if (suggestion?.categoryId) {
      categoryId = suggestion.categoryId;
    } else {
      const fallbackCat = await prisma.category.findFirst({ where: { userId: req.userId, name: 'Other' } });
      if (fallbackCat) categoryId = fallbackCat.id;
    }
  }

  const txn = await prisma.transaction.create({
    data: { ...rest, categoryId, date: new Date(date), userId: req.userId },
  });

  audit(req.userId, 'create', txn.id, { type: txn.type, amount: txn.amount, description: txn.description });

  res.status(201).json({ success: true, data: txn });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId, deletedAt: null },
    include: { category: true },
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

  audit(req.userId, 'update', txn.id, { before: { amount: existing.amount, categoryId: existing.categoryId }, after: { amount: txn.amount, categoryId: txn.categoryId } });

  if (parsed.data.categoryId && existing.merchant && parsed.data.categoryId !== existing.categoryId) {
    const newCat = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
    if (newCat) {
      trainFromUserCorrection(existing.merchant, existing.description, newCat.name);
    }
  }

  res.json({ success: true, data: txn });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId, deletedAt: null },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Transaction not found' });

  await prisma.transaction.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });

  audit(req.userId, 'delete', existing.id, { type: existing.type, amount: existing.amount, description: existing.description });

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

    const data = await Promise.all(items.map(async (item: Record<string, unknown>) => {
      let categoryId = item.categoryId as string;
      if (!validCatIds.has(categoryId)) {
        const suggestion = await suggestCategoryWithML(req.userId, (item.merchant as string) || '', (item.description as string) || '');
        if (suggestion?.categoryId && validCatIds.has(suggestion.categoryId)) {
          categoryId = suggestion.categoryId;
        } else {
          categoryId = fallbackCat?.id as string;
        }
      }
      return {
        userId: req.userId,
        type: (item.type || 'expense') as 'income' | 'expense',
        amount: item.amount as number,
        currency: (item.currency || 'USD') as 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'CAD' | 'AUD',
        description: item.description as string,
        merchant: (item.merchant as string) || null,
        categoryId,
        paymentMethod: (item.paymentMethod || 'other') as 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'other',
        date: new Date(item.date as string),
        notes: (item.notes as string) || null,
        status: (item.status || 'cleared') as 'pending' | 'cleared' | 'flagged',
        isRecurring: (item.isRecurring as boolean) || false,
      };

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

  const result = await prisma.transaction.updateMany({
    where: { id: { in: ids }, userId: req.userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  for (const id of ids) {
    audit(req.userId, 'bulk_delete', id, null);
  }

  res.json({ success: true, message: `${result.count} transaction(s) deleted` });
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId, deletedAt: { not: null } },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Transaction not found or not deleted' });

  await prisma.transaction.update({
    where: { id: req.params.id },
    data: { deletedAt: null },
  });

  audit(req.userId, 'restore', existing.id, null);

  res.json({ success: true, message: 'Transaction restored' });
});

const splitSchema = z.object({
  splits: z.array(z.object({
    amount: z.number().positive(),
    description: z.string().optional(),
    categoryId: z.string(),
  })).min(1),
});

router.post('/:id/splits', async (req: Request, res: Response) => {
  const txn = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId, deletedAt: null },
  });
  if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

  const parsed = splitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const totalSplit = parsed.data.splits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(totalSplit - txn.amount) > 0.01) {
    return res.status(400).json({ success: false, error: `Split total (${totalSplit}) must equal transaction amount (${txn.amount})` });
  }

  for (const split of parsed.data.splits) {
    const cat = await prisma.category.findFirst({ where: { id: split.categoryId, userId: req.userId } });
    if (!cat) return res.status(400).json({ success: false, error: `Category ${split.categoryId} not found` });
  }

  await prisma.transactionSplit.deleteMany({ where: { transactionId: txn.id } });

  await prisma.transactionSplit.createMany({
    data: parsed.data.splits.map((s) => ({
      amount: s.amount,
      description: s.description || null,
      categoryId: s.categoryId,
      transactionId: txn.id,
    })),
  });

  const updated = await prisma.transaction.findUnique({
    where: { id: txn.id },
    include: { splits: true },
  });

  res.json({ success: true, data: updated });
});

router.delete('/:id/splits', async (req: Request, res: Response) => {
  const txn = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId, deletedAt: null },
  });
  if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

  await prisma.transactionSplit.deleteMany({ where: { transactionId: txn.id } });

  const updated = await prisma.transaction.findUnique({
    where: { id: txn.id },
    include: { splits: true },
  });

  res.json({ success: true, data: updated });
});

export default router;
