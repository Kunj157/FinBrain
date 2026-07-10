import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { transactions } from './transactions';
import { categories } from './categories';

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

interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string | null;
  spent: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
}

const budgets: Budget[] = [];
let nextId = 1;

function computeSpent(categoryId: string, period: 'weekly' | 'monthly' | 'yearly', startDate: string): number {
  const start = new Date(startDate);
  let end: Date;
  if (period === 'weekly') {
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (period === 'monthly') {
    end = new Date(start);
    end.setMonth(end.getMonth() + 1);
  } else {
    end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
  }

  return transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      if (t.categoryId !== categoryId) return false;
      const txnDate = new Date(t.date);
      return txnDate >= start && txnDate < end;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

router.get('/', (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid query', details: parsed.error.format() });
  }

  let filtered = budgets.map((b) => {
    const spent = computeSpent(b.categoryId, b.period, b.startDate);
    return { ...b, spent, remaining: Math.max(b.amount - spent, 0) };
  });

  if (parsed.data.period) filtered = filtered.filter((b) => b.period === parsed.data.period);
  if (parsed.data.categoryId) filtered = filtered.filter((b) => b.categoryId === parsed.data.categoryId);

  res.json({ success: true, data: filtered });
});

router.get('/:id', (req: Request, res: Response) => {
  const budget = budgets.find((b) => b.id === req.params.id);
  if (!budget) return res.status(404).json({ success: false, error: 'Budget not found' });

  const spent = computeSpent(budget.categoryId, budget.period, budget.startDate);
  res.json({ success: true, data: { ...budget, spent, remaining: Math.max(budget.amount - spent, 0) } });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = createBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const category = categories.find((c) => c.id === parsed.data.categoryId);
  if (!category) return res.status(400).json({ success: false, error: 'Category not found' });

  const existing = budgets.find(
    (b) => b.categoryId === parsed.data.categoryId && b.period === parsed.data.period && b.startDate === parsed.data.startDate,
  );
  if (existing) {
    return res.status(400).json({ success: false, error: 'Budget already exists for this category and period' });
  }

  const now = new Date();
  let endDate: string | null = null;
  const start = new Date(parsed.data.startDate);
  if (parsed.data.period === 'weekly') {
    endDate = new Date(start.getTime() + 7 * 86400000).toISOString();
  } else if (parsed.data.period === 'monthly') {
    endDate = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate()).toISOString();
  } else {
    endDate = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate()).toISOString();
  }

  const budget: Budget = {
    id: String(nextId++),
    userId: (req.headers['x-user-id'] as string) || 'dev-user-001',
    categoryId: parsed.data.categoryId,
    amount: parsed.data.amount,
    currency: 'USD',
    period: parsed.data.period,
    startDate: parsed.data.startDate,
    endDate,
    spent: 0,
    remaining: parsed.data.amount,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  budgets.push(budget);
  res.status(201).json({ success: true, data: budget });
});

router.put('/:id', (req: Request, res: Response) => {
  const idx = budgets.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Budget not found' });

  const parsed = updateBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  budgets[idx] = { ...budgets[idx], ...parsed.data, updatedAt: new Date().toISOString() };
  const spent = computeSpent(budgets[idx].categoryId, budgets[idx].period, budgets[idx].startDate);
  res.json({ success: true, data: { ...budgets[idx], spent, remaining: Math.max(budgets[idx].amount - spent, 0) } });
});

router.delete('/:id', (req: Request, res: Response) => {
  const idx = budgets.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Budget not found' });

  budgets.splice(idx, 1);
  res.json({ success: true, message: 'Budget deleted' });
});

export default router;
