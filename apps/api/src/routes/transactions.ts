import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

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

export const transactions: any[] = [];
export let nextId = 1;

router.get('/', (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid query', details: parsed.error.format() });
  }

  const { page, limit, type, categoryId, startDate, endDate, search, paymentMethod, sort, order } = parsed.data;

  let filtered = [...transactions];

  if (type) filtered = filtered.filter((t) => t.type === type);
  if (categoryId) filtered = filtered.filter((t) => t.categoryId === categoryId);
  if (paymentMethod) filtered = filtered.filter((t) => t.paymentMethod === paymentMethod);
  if (startDate) filtered = filtered.filter((t) => t.date >= startDate);
  if (endDate) filtered = filtered.filter((t) => t.date <= endDate);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t) =>
      t.description.toLowerCase().includes(q) ||
      (t.merchant && t.merchant.toLowerCase().includes(q)) ||
      t.amount.toString().includes(q),
    );
  }

  filtered.sort((a, b) => {
    const aVal = a[sort];
    const bVal = b[sort];
    if (typeof aVal === 'string') {
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  res.json({ success: true, data: { data, total, page, limit, totalPages } });
});

router.get('/:id', (req: Request, res: Response) => {
  const txn = transactions.find((t) => t.id === req.params.id);
  if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
  res.json({ success: true, data: txn });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = createTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const txn = {
    id: String(nextId++),
    userId: req.headers['x-user-id'] || 'dev-user-001',
    ...parsed.data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  transactions.unshift(txn);
  res.status(201).json({ success: true, data: txn });
});

router.put('/:id', (req: Request, res: Response) => {
  const idx = transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Transaction not found' });

  const parsed = updateTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  transactions[idx] = { ...transactions[idx], ...parsed.data, updatedAt: new Date().toISOString() };
  res.json({ success: true, data: transactions[idx] });
});

router.delete('/:id', (req: Request, res: Response) => {
  const idx = transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Transaction not found' });

  transactions.splice(idx, 1);
  res.json({ success: true, message: 'Transaction deleted' });
});

router.post('/bulk', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'items array is required' });
  }

  const created = items.map((item: Record<string, unknown>) => ({
    id: String(nextId++),
    userId: req.headers['x-user-id'] || 'dev-user-001',
    ...item,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  transactions.unshift(...created);
  res.status(201).json({ success: true, data: created });
});

router.delete('/bulk', (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'ids array is required' });
  }

  const idSet = new Set(ids);
  for (let i = transactions.length - 1; i >= 0; i--) {
    if (idSet.has(transactions[i].id)) {
      transactions.splice(i, 1);
    }
  }

  res.json({ success: true, message: `${ids.length} transaction(s) deleted` });
});

export default router;