import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().default('#6b7280'),
});

const updateTagSchema = createTagSchema.partial();

router.get('/', async (req: Request, res: Response) => {
  const tags = await prisma.tag.findMany({
    where: { userId: req.userId },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: tags });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const existing = await prisma.tag.findFirst({
    where: { userId: req.userId, name: parsed.data.name },
  });
  if (existing) {
    return res.status(400).json({ success: false, error: 'Tag already exists' });
  }

  const tag = await prisma.tag.create({
    data: { ...parsed.data, userId: req.userId },
  });

  res.status(201).json({ success: true, data: tag });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.tag.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Tag not found' });

  const parsed = updateTagSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const tag = await prisma.tag.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json({ success: true, data: tag });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.tag.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Tag not found' });

  await prisma.transactionTag.deleteMany({ where: { tagId: req.params.id } });
  await prisma.tag.delete({ where: { id: req.params.id } });

  res.json({ success: true, message: 'Tag deleted' });
});

router.post('/transaction/:transactionId', async (req: Request, res: Response) => {
  const { tagIds } = req.body;
  if (!Array.isArray(tagIds)) {
    return res.status(400).json({ success: false, error: 'tagIds array is required' });
  }

  const txn = await prisma.transaction.findFirst({
    where: { id: req.params.transactionId, userId: req.userId },
  });
  if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

  await prisma.transactionTag.deleteMany({
    where: { transactionId: req.params.transactionId },
  });

  if (tagIds.length > 0) {
    await prisma.transactionTag.createMany({
      data: tagIds.map((tagId: string) => ({
        transactionId: req.params.transactionId,
        tagId,
      })),
    });
  }

  const updated = await prisma.transaction.findUnique({
    where: { id: req.params.transactionId },
    include: { tags: { include: { tag: true } } },
  });

  res.json({ success: true, data: updated });
});

export default router;
