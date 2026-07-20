import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma';
import { computeDataQualityScore, detectDuplicateTransactions, detectMissingCategories } from '../services/data-quality';
import { getTransactionAmountAbs } from '../services/finance-math';

const router = Router();

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { score, confidence, summary } = await computeDataQualityScore(req.userId);
    res.json({ success: true, data: { score, confidence, ...summary } });
  } catch (err) {
    console.error('Data quality summary error:', err);
    res.status(500).json({ success: false, error: 'Failed to compute data quality' });
  }
});

router.post('/fix/common', async (req: Request, res: Response) => {
  try {
    const fixes: string[] = [];

    const dupes = await detectDuplicateTransactions(req.userId);
    if (dupes.transactionIds && dupes.transactionIds.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: dupes.transactionIds }, userId: req.userId },
        data: { needsReview: true },
      });
      fixes.push(`Marked ${dupes.transactionIds.length} duplicate(s) for review`);
    }

    const uncategorized = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        deletedAt: null,
        category: { name: 'Other' },
      },
    });
    if (uncategorized.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: uncategorized.map((t) => t.id) } },
        data: { needsReview: true },
      });
      fixes.push(`Marked ${uncategorized.length} uncategorized transaction(s) for review`);
    }

    res.json({
      success: true,
      data: {
        fixes,
        message: fixes.length > 0
          ? `Applied ${fixes.length} fix(es). Review flagged transactions.`
          : 'No common issues to fix.',
      },
    });
  } catch (err) {
    console.error('Data quality fix error:', err);
    res.status(500).json({ success: false, error: 'Failed to apply fixes' });
  }
});

export default router;
