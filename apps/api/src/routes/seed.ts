import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma';
import { loadBulkML } from '../services/auto-categorize-ml';
import { suggestCategoryWithML } from '../services/auto-categorize';

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

router.post('/re-categorize', async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      include: { category: true },
    });

    if (transactions.length === 0) {
      return res.json({ success: true, data: { message: 'No transactions to re-categorize.', updated: 0 } });
    }

    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
    });
    const catByName = new Map(categories.map(c => [c.name, c.id]));

    let updated = 0;
    const results: { merchant: string; oldCategory: string; newCategory: string }[] = [];

    for (const tx of transactions) {
      const merchant = tx.merchant || '';
      const description = tx.description || '';
      if (!merchant && !description) continue;

      const suggestion = await suggestCategoryWithML(req.userId, merchant, description);
      if (suggestion && suggestion.categoryName && suggestion.categoryId && suggestion.categoryId !== tx.categoryId) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { categoryId: suggestion.categoryId },
        });
        results.push({
          merchant: merchant.slice(0, 40),
          oldCategory: tx.category?.name || 'None',
          newCategory: suggestion.categoryName,
        });
        updated++;
      }
    }

    res.json({
      success: true,
      data: {
        message: `Re-categorized ${updated} of ${transactions.length} transactions`,
        updated,
        total: transactions.length,
        changes: results,
      },
    });
  } catch (error) {
    console.error('Re-categorize error:', error);
    res.status(500).json({ success: false, error: 'Failed to re-categorize transactions' });
  }
});

export default router;
