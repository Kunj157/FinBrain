import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, DEV_USER_ID } from '../prisma';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default('folder'),
  color: z.string().default('#6b7280'),
  parentId: z.string().optional(),
});

const updateSchema = createSchema.partial();

router.get('/', async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { userId: DEV_USER_ID },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: categories });
});

router.get('/:id', async (req: Request, res: Response) => {
  const cat = await prisma.category.findFirst({
    where: { id: req.params.id, userId: DEV_USER_ID },
  });
  if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
  res.json({ success: true, data: cat });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const cat = await prisma.category.create({
    data: {
      ...parsed.data,
      userId: DEV_USER_ID,
      isCustom: true,
    },
  });

  res.status(201).json({ success: true, data: cat });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.category.findFirst({
    where: { id: req.params.id, userId: DEV_USER_ID },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Category not found' });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const cat = await prisma.category.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json({ success: true, data: cat });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.category.findFirst({
    where: { id: req.params.id, userId: DEV_USER_ID },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Category not found' });
  if (!existing.isCustom) {
    return res.status(400).json({ success: false, error: 'Cannot delete default category' });
  }

  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Category deleted' });
});

export default router;
