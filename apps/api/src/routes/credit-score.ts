import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const [scores, latest] = await Promise.all([
    prisma.creditScore.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
      take: limit,
    }),
    prisma.creditScore.findFirst({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
    }),
  ]);

  res.json({ success: true, data: { scores, latest } });
});

router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    score: z.number().int().min(300).max(900),
    provider: z.string().default('manual'),
    date: z.string().optional(),
    factors: z.any().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Score must be between 300 and 900' });
  }

  const score = await prisma.creditScore.create({
    data: {
      userId: req.userId,
      score: parsed.data.score,
      provider: parsed.data.provider,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      factors: parsed.data.factors || undefined,
    },
  });

  res.json({ success: true, data: score });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.creditScore.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Credit score entry not found' });
  }

  await prisma.creditScore.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Deleted' });
});

export default router;
