import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const createRuleSchema = z.object({
  priority: z.number().int().default(0),
  merchantPattern: z.string().max(255).optional(),
  descriptionPattern: z.string().max(255).optional(),
  categoryId: z.string(),
  isActive: z.boolean().default(true),
});

const updateRuleSchema = createRuleSchema.partial();

router.get('/', async (req: Request, res: Response) => {
  const rules = await prisma.categorizationRule.findMany({
    where: { userId: req.userId },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { priority: 'desc' },
  });
  res.json({ success: true, data: rules });
});

router.get('/:id', async (req: Request, res: Response) => {
  const rule = await prisma.categorizationRule.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { category: { select: { id: true, name: true, color: true } } },
  });
  if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
  res.json({ success: true, data: rule });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const cat = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId: req.userId },
  });
  if (!cat) return res.status(400).json({ success: false, error: 'Category not found' });

  const rule = await prisma.categorizationRule.create({
    data: { ...parsed.data, userId: req.userId },
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  res.status(201).json({ success: true, data: rule });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.categorizationRule.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Rule not found' });

  const parsed = updateRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  if (parsed.data.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, userId: req.userId },
    });
    if (!cat) return res.status(400).json({ success: false, error: 'Category not found' });
  }

  const rule = await prisma.categorizationRule.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  res.json({ success: true, data: rule });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.categorizationRule.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Rule not found' });

  await prisma.categorizationRule.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Rule deleted' });
});

export default router;
