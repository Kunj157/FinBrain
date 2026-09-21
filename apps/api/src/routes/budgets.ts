import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { type Budget } from '@prisma/client';
import { prisma } from '../prisma';
import { suggestBudgets, autoSuggestBudgets, detectFlexCategories } from '../services/budget-suggest';

const router = Router();

const createBudgetSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  period: z.enum(['weekly', 'monthly', 'yearly']).default('monthly'),
  startDate: z.string(),
});

const updateBudgetSchema = createBudgetSchema.partial();

const querySchema = z.object({
  period: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  categoryId: z.string().optional(),
});

function computeEndDate(startDate: string, period: 'weekly' | 'monthly' | 'yearly'): Date {
  const start = new Date(startDate);
  if (period === 'weekly') return new Date(start.getTime() + 7 * 86400000);
  if (period === 'monthly') return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
  return new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
}

async function computeSpent(userId: string, categoryId: string, period: 'weekly' | 'monthly' | 'yearly', startDate: string): Promise<number> {
  const start = new Date(startDate);
  const end = computeEndDate(startDate, period);

  const result = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      type: 'expense',
      categoryId,
      date: { gte: start, lt: end },
    },
  });

  return result._sum.amount || 0;
}

router.get('/', async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid query', details: parsed.error.format() });
  }

  const where = {
    userId: req.userId,
    ...(parsed.data.period && { period: parsed.data.period }),
    ...(parsed.data.categoryId && { categoryId: parsed.data.categoryId }),
  };

  const budgets = await prisma.budget.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const enriched = await Promise.all(
    budgets.map(async (b: Budget) => {
      const spent = await computeSpent(req.userId, b.categoryId, b.period, b.startDate.toISOString());
      return { ...b, spent, remaining: Math.max(b.amount - spent, 0) };
    }),
  );

  res.json({ success: true, data: enriched });
});

router.get('/:id', async (req: Request, res: Response) => {
  const budget = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!budget) return res.status(404).json({ success: false, error: 'Budget not found' });

  const spent = await computeSpent(req.userId, budget.categoryId, budget.period, budget.startDate.toISOString());
  res.json({ success: true, data: { ...budget, spent, remaining: Math.max(budget.amount - spent, 0) } });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId: req.userId },
  });
  if (!category) return res.status(400).json({ success: false, error: 'Category not found' });

  const existing = await prisma.budget.findFirst({
    where: {
      userId: req.userId,
      categoryId: parsed.data.categoryId,
      period: parsed.data.period,
      startDate: new Date(parsed.data.startDate),
    },
  });
  if (existing) {
    return res.status(400).json({ success: false, error: 'Budget already exists for this category and period' });
  }

  const endDate = computeEndDate(parsed.data.startDate, parsed.data.period);

  const budget = await prisma.budget.create({
    data: {
      userId: req.userId,
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      period: parsed.data.period,
      startDate: new Date(parsed.data.startDate),
      endDate,
    },
  });

  res.status(201).json({ success: true, data: budget });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Budget not found' });

  const parsed = updateBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.categoryId) updateData.categoryId = parsed.data.categoryId;
  if (parsed.data.amount) updateData.amount = parsed.data.amount;
  if (parsed.data.period) updateData.period = parsed.data.period;
  if (parsed.data.startDate) {
    updateData.startDate = new Date(parsed.data.startDate);
    updateData.endDate = computeEndDate(parsed.data.startDate, parsed.data.period || existing.period);
  }

  const budget = await prisma.budget.update({
    where: { id: req.params.id },
    data: updateData,
  });

  const spent = await computeSpent(req.userId, budget.categoryId, budget.period, budget.startDate.toISOString());
  res.json({ success: true, data: { ...budget, spent, remaining: Math.max(budget.amount - spent, 0) } });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Budget not found' });

  await prisma.budget.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Budget deleted' });
});

router.get('/suggest/auto', async (req: Request, res: Response) => {
  try {
    const suggestions = await suggestBudgets(req.userId);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    console.error('Budget suggestion error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate suggestions' });
  }
});

router.post('/suggest/auto', async (req: Request, res: Response) => {
  try {
    const budgets = await autoSuggestBudgets(req.userId);
    res.json({ success: true, data: budgets, message: `Created ${budgets.length} auto-suggested budget(s)` });
  } catch (err) {
    console.error('Auto-suggest error:', err);
    res.status(500).json({ success: false, error: 'Failed to auto-suggest budgets' });
  }
});

router.get('/flex/categories', async (req: Request, res: Response) => {
  try {
    const categories = await detectFlexCategories(req.userId);
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Flex categories error:', err);
    res.status(500).json({ success: false, error: 'Failed to detect flex categories' });
  }
});

router.get('/flex/plan', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId, startDate: monthStart },
      include: { category: { select: { name: true } } },
    });

    const categories = await detectFlexCategories(req.userId);

    const plan = {
      month: monthStart.toISOString(),
      fixed: budgets.filter((b) => b.bucketType === 'fixed').map((b) => ({
        category: b.category?.name || 'Unknown',
        budget: b.amount,
        spent: b.spent,
      })),
      flexible: budgets.filter((b) => b.bucketType === 'flexible' || !b.bucketType).map((b) => ({
        category: b.category?.name || 'Unknown',
        budget: b.amount,
        spent: b.spent,
      })),
      nonMonthly: budgets.filter((b) => b.bucketType === 'non_monthly').map((b) => ({
        category: b.category?.name || 'Unknown',
        budget: b.amount,
        spent: b.spent,
      })),
      suggestedCategories: categories,
    };

    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('Flex plan error:', err);
    res.status(500).json({ success: false, error: 'Failed to get flex plan' });
  }
});

export default router;
