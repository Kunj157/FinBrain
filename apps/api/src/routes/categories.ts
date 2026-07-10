import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

const router = Router();

interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  parentId?: string;
  isCustom: boolean;
  createdAt: string;
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default('folder'),
  color: z.string().default('#6b7280'),
  parentId: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const categories: Category[] = [
  { id: '1', userId: 'dev-user-001', name: 'Income', icon: 'trending-up', color: '#10b981', isCustom: false, createdAt: new Date().toISOString() },
  { id: '2', userId: 'dev-user-001', name: 'Food & Drink', icon: 'utensils', color: '#f59e0b', isCustom: false, createdAt: new Date().toISOString() },
  { id: '3', userId: 'dev-user-001', name: 'Shopping', icon: 'shopping-bag', color: '#8b5cf6', isCustom: false, createdAt: new Date().toISOString() },
  { id: '4', userId: 'dev-user-001', name: 'Transport', icon: 'car', color: '#3b82f6', isCustom: false, createdAt: new Date().toISOString() },
  { id: '5', userId: 'dev-user-001', name: 'Bills & Utilities', icon: 'receipt', color: '#ef4444', isCustom: false, createdAt: new Date().toISOString() },
  { id: '6', userId: 'dev-user-001', name: 'Entertainment', icon: 'film', color: '#ec4899', isCustom: false, createdAt: new Date().toISOString() },
  { id: '7', userId: 'dev-user-001', name: 'Healthcare', icon: 'heart', color: '#14b8a6', isCustom: false, createdAt: new Date().toISOString() },
  { id: '8', userId: 'dev-user-001', name: 'Education', icon: 'book', color: '#6366f1', isCustom: false, createdAt: new Date().toISOString() },
  { id: '9', userId: 'dev-user-001', name: 'Housing', icon: 'home', color: '#f97316', isCustom: false, createdAt: new Date().toISOString() },
  { id: '10', userId: 'dev-user-001', name: 'Other', icon: 'more-horizontal', color: '#6b7280', isCustom: false, createdAt: new Date().toISOString() },
];

let nextCategoryId = 11;

router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: categories });
});

router.get('/:id', (req: Request, res: Response) => {
  const cat = categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
  res.json({ success: true, data: cat });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const cat = {
    id: String(nextCategoryId++),
    userId: (req.headers['x-user-id'] as string) || 'dev-user-001',
    ...parsed.data,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  categories.push(cat);
  res.status(201).json({ success: true, data: cat });
});

router.put('/:id', (req: Request, res: Response) => {
  const idx = categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Category not found' });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  categories[idx] = { ...categories[idx], ...parsed.data };
  res.json({ success: true, data: categories[idx] });
});

router.delete('/:id', (req: Request, res: Response) => {
  const idx = categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Category not found' });
  if (!categories[idx].isCustom) {
    return res.status(400).json({ success: false, error: 'Cannot delete default category' });
  }

  categories.splice(idx, 1);
  res.json({ success: true, message: 'Category deleted' });
});

export default router;