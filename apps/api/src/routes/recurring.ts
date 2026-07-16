import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { detectRecurring } from '../services/recurring-detector';

const router = Router();

const updatePatternSchema = z.object({
  amount: z.number().positive().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
  nextDueDate: z.string().optional(),
  categoryId: z.string().optional(),
});

const snoozeSchema = z.object({
  duration: z.enum(['1week', '2weeks', '1month']).default('1week'),
});

function computeNextDueDate(current: Date, frequency: string): Date {
  const d = new Date(current);
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

router.get('/', async (req: Request, res: Response) => {
  const stored = await prisma.recurringPattern.findMany({
    where: { userId: req.userId },
    include: { category: true },
    orderBy: { nextDueDate: 'asc' },
  });

  if (stored.length > 0) {
    const active = stored.filter(p => p.isActive && !p.isSnoozed);
    const totalMonthlyCost = active.reduce((s, p) => {
      const multiplier = p.frequency === 'weekly' ? 4.33 : p.frequency === 'biweekly' ? 2.17 : p.frequency === 'quarterly' ? 0.33 : p.frequency === 'yearly' ? 0.083 : 1;
      return s + p.avgAmount * multiplier;
    }, 0);

    return res.json({
      success: true,
      data: {
        patterns: stored.map(p => ({
          id: p.id,
          merchant: p.merchant,
          description: p.description || '',
          amount: p.amount,
          avgAmount: p.avgAmount,
          frequency: p.frequency,
          nextExpectedDate: p.nextDueDate.toISOString(),
          lastDate: p.lastDate.toISOString(),
          transactionCount: 0,
          totalSpent: 0,
          monthlyCost: p.avgAmount * (p.frequency === 'weekly' ? 4.33 : p.frequency === 'biweekly' ? 2.17 : p.frequency === 'quarterly' ? 0.33 : p.frequency === 'yearly' ? 0.083 : 1),
          categoryId: p.categoryId,
          categoryName: p.category.name,
          categoryColor: p.category.color,
          transactions: [],
          isActive: p.isActive,
          isSnoozed: p.isSnoozed,
          snoozedUntil: p.snoozedUntil?.toISOString(),
          confidence: p.confidence,
        })),
        summary: {
          totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
          activeCount: active.length,
          upcomingThisMonth: active.filter(p => {
            const next = new Date(p.nextDueDate);
            const now = new Date();
            return next.getMonth() === now.getMonth() && next.getFullYear() === now.getFullYear();
          }).length,
          totalTransactions: 0,
        },
      },
    });
  }

  const detected = await detectRecurring(req.userId);

  for (const d of detected) {
    const category = await prisma.category.findFirst({
      where: { userId: req.userId, name: d.categoryName },
    });
    if (!category) continue;

    await prisma.recurringPattern.create({
      data: {
        merchant: d.merchant,
        description: d.description,
        amount: d.amount,
        avgAmount: d.avgAmount,
        frequency: d.frequency,
        nextDueDate: new Date(d.nextExpectedDate),
        lastDate: new Date(d.lastDate),
        confidence: 0.8,
        categoryId: category.id,
        userId: req.userId,
      },
    });
  }

  const storedAfter = await prisma.recurringPattern.findMany({
    where: { userId: req.userId },
    include: { category: true },
    orderBy: { nextDueDate: 'asc' },
  });

  const active = storedAfter.filter(p => p.isActive && !p.isSnoozed);
  const totalMonthlyCost = active.reduce((s, p) => {
    const multiplier = p.frequency === 'weekly' ? 4.33 : p.frequency === 'biweekly' ? 2.17 : p.frequency === 'quarterly' ? 0.33 : p.frequency === 'yearly' ? 0.083 : 1;
    return s + p.avgAmount * multiplier;
  }, 0);

  res.json({
    success: true,
    data: {
      patterns: storedAfter.map(p => ({
        id: p.id,
        merchant: p.merchant,
        description: p.description || '',
        amount: p.amount,
        avgAmount: p.avgAmount,
        frequency: p.frequency,
        nextExpectedDate: p.nextDueDate.toISOString(),
        lastDate: p.lastDate.toISOString(),
        transactionCount: 0,
        totalSpent: 0,
        monthlyCost: p.avgAmount * (p.frequency === 'weekly' ? 4.33 : p.frequency === 'biweekly' ? 2.17 : p.frequency === 'quarterly' ? 0.33 : p.frequency === 'yearly' ? 0.083 : 1),
        categoryId: p.categoryId,
        categoryName: p.category.name,
        categoryColor: p.category.color,
        transactions: [],
        isActive: p.isActive,
        isSnoozed: p.isSnoozed,
        snoozedUntil: p.snoozedUntil?.toISOString(),
        confidence: p.confidence,
      })),
      summary: {
        totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
        activeCount: active.length,
        upcomingThisMonth: active.filter(p => {
          const next = new Date(p.nextDueDate);
          const now = new Date();
          return next.getMonth() === now.getMonth() && next.getFullYear() === now.getFullYear();
        }).length,
        totalTransactions: detected.reduce((s, p) => s + p.transactionCount, 0),
      },
    },
  });
});

router.post('/sync', async (req: Request, res: Response) => {
  const detected = await detectRecurring(req.userId);

  const results = [];
  for (const d of detected) {
    const category = await prisma.category.findFirst({
      where: { userId: req.userId, name: d.categoryName },
    });
    if (!category) continue;

    const existing = await prisma.recurringPattern.findFirst({
      where: { userId: req.userId, merchant: d.merchant },
    });

    if (existing) {
      await prisma.recurringPattern.update({
        where: { id: existing.id },
        data: {
          amount: d.amount,
          avgAmount: d.avgAmount,
          frequency: d.frequency,
          nextDueDate: new Date(d.nextExpectedDate),
          lastDate: new Date(d.lastDate),
        },
      });
      results.push({ id: existing.id, action: 'updated' });
    } else {
      const created = await prisma.recurringPattern.create({
        data: {
          merchant: d.merchant,
          description: d.description,
          amount: d.amount,
          avgAmount: d.avgAmount,
          frequency: d.frequency,
          nextDueDate: new Date(d.nextExpectedDate),
          lastDate: new Date(d.lastDate),
          confidence: 0.8,
          categoryId: category.id,
          userId: req.userId,
        },
      });
      results.push({ id: created.id, action: 'created' });
    }
  }

  res.json({ success: true, data: { synced: results.length, results } });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.recurringPattern.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Pattern not found' });

  const parsed = updatePatternSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
  if (parsed.data.frequency) updateData.frequency = parsed.data.frequency;
  if (parsed.data.nextDueDate) updateData.nextDueDate = new Date(parsed.data.nextDueDate);
  if (parsed.data.categoryId) updateData.categoryId = parsed.data.categoryId;

  const updated = await prisma.recurringPattern.update({
    where: { id: req.params.id },
    data: updateData,
    include: { category: true },
  });

  res.json({ success: true, data: updated });
});

router.post('/:id/snooze', async (req: Request, res: Response) => {
  const existing = await prisma.recurringPattern.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Pattern not found' });

  const parsed = snoozeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const snoozedUntil = new Date();
  switch (parsed.data.duration) {
    case '1week': snoozedUntil.setDate(snoozedUntil.getDate() + 7); break;
    case '2weeks': snoozedUntil.setDate(snoozedUntil.getDate() + 14); break;
    case '1month': snoozedUntil.setMonth(snoozedUntil.getMonth() + 1); break;
  }

  const updated = await prisma.recurringPattern.update({
    where: { id: req.params.id },
    data: { isSnoozed: true, snoozedUntil },
  });

  res.json({ success: true, data: updated });
});

router.post('/:id/dismiss', async (req: Request, res: Response) => {
  const existing = await prisma.recurringPattern.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Pattern not found' });

  const updated = await prisma.recurringPattern.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ success: true, data: updated });
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  const existing = await prisma.recurringPattern.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Pattern not found' });

  const updated = await prisma.recurringPattern.update({
    where: { id: req.params.id },
    data: { isActive: true },
  });

  res.json({ success: true, data: updated });
});

router.post('/:id/mark-paid', async (req: Request, res: Response) => {
  const existing = await prisma.recurringPattern.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Pattern not found' });

  const nextDue = computeNextDueDate(existing.nextDueDate, existing.frequency);

  const updated = await prisma.recurringPattern.update({
    where: { id: req.params.id },
    data: {
      nextDueDate: nextDue,
      lastDate: new Date(),
      isSnoozed: false,
      snoozedUntil: null,
    },
  });

  res.json({ success: true, data: updated });
});

export default router;
