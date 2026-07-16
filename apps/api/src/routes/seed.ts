import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma';
import { loadBulkML } from '../services/auto-categorize-ml';

const router = Router();

router.post('/categories', async (req: Request, res: Response) => {
  res.json({ success: true, data: { message: 'Categories already seeded on startup' } });
});

router.delete('/transactions', async (req: Request, res: Response) => {
  const result = await prisma.transaction.deleteMany({ where: { userId: req.userId } });
  res.json({ success: true, data: { count: result.count, message: `Deleted ${result.count} transactions` } });
});

router.delete('/transactions/bulk', async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'ids array is required' });
  }

  const result = await prisma.transaction.deleteMany({
    where: { id: { in: ids }, userId: req.userId },
  });

  res.json({ success: true, data: { deleted: result.count, message: `${result.count} transaction(s) deleted` } });
});

router.post('/ml-categorizer', async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId, merchant: { not: null } },
      include: { category: true },
    });

    if (transactions.length === 0) {
      return res.json({ success: true, data: { message: 'No transactions to train on.', samplesUsed: 0 } });
    }

    const seen = new Set<string>();
    const samples: { merchant: string; description: string; category: string }[] = [];

    for (const tx of transactions) {
      const merchant = (tx.merchant || '').trim();
      const description = (tx.description || '').trim();
      const categoryName = tx.category?.name || 'Other';
      if (!merchant && !description) continue;
      const key = `${merchant}|${description}|${categoryName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      samples.push({ merchant, description, category: categoryName });
    }

    if (samples.length === 0) {
      return res.json({ success: true, data: { message: 'No unique samples found.', samplesUsed: 0 } });
    }

    const result = await loadBulkML(samples, false);
    if (!result) {
      return res.status(503).json({ success: false, error: 'ML service unavailable. Make sure it is running on port 8000.' });
    }

    res.json({
      success: true,
      data: {
        message: `Trained categorizer on ${result.samplesUsed} unique samples from ${transactions.length} transactions`,
        samplesUsed: result.samplesUsed,
        accuracy: result.accuracy,
      },
    });
  } catch (error) {
    console.error('ML categorizer seed error:', error);
    res.status(500).json({ success: false, error: 'Failed to train categorizer' });
  }
});

export default router;
