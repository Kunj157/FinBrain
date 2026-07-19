import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const createCreditScoreSchema = z.object({
  score: z.number().int().min(300).max(850),
  provider: z.string().max(100).default('manual'),
  factors: z.array(z.string().max(200)).default([]),
  notes: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const scores = await prisma.creditScore.findMany({
    where: { userId: req.userId },
    orderBy: { date: 'desc' },
  });

  res.json({ success: true, data: scores });
});

router.get('/latest', async (req: Request, res: Response) => {
  const latest = await prisma.creditScore.findFirst({
    where: { userId: req.userId },
    orderBy: { date: 'desc' },
  });

  if (!latest) {
    return res.json({ success: true, data: null });
  }

  const previous = await prisma.creditScore.findFirst({
    where: { userId: req.userId, date: { lt: latest.date } },
    orderBy: { date: 'desc' },
  });

  const change = previous ? latest.score - previous.score : 0;

  res.json({
    success: true,
    data: {
      ...latest,
      change,
      previousScore: previous?.score ?? null,
    },
  });
});

router.get('/stats', async (req: Request, res: Response) => {
  const scores = await prisma.creditScore.findMany({
    where: { userId: req.userId },
    orderBy: { date: 'asc' },
  });

  if (scores.length === 0) {
    return res.json({
      success: true,
      data: {
        current: null,
        highest: null,
        lowest: null,
        average: null,
        count: 0,
        trend: [],
      },
    });
  }

  const values = scores.map((s) => s.score);
  const trend = scores.map((s) => ({
    score: s.score,
    date: s.date,
    provider: s.provider,
  }));

  res.json({
    success: true,
    data: {
      current: values[values.length - 1],
      highest: Math.max(...values),
      lowest: Math.min(...values),
      average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      count: scores.length,
      trend,
    },
  });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createCreditScoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const { date, ...data } = parsed.data;

  const score = await prisma.creditScore.create({
    data: {
      ...data,
      factors: JSON.stringify(data.factors),
      userId: req.userId,
      ...(date ? { date: new Date(date) } : {}),
    },
  });

  res.status(201).json({ success: true, data: score });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.creditScore.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Credit score entry not found' });
  }

  await prisma.creditScore.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Credit score entry deleted' });
});

export default router;
