import { Router, type Request, type Response } from 'express';
import { detectRecurring } from '../services/recurring-detector';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const patterns = await detectRecurring(req.userId);

    const totalMonthlyCost = patterns.reduce((s, p) => s + p.monthlyCost, 0);
    const upcomingThisMonth = patterns.filter(p => {
      const next = new Date(p.nextExpectedDate);
      const now = new Date();
      return next.getMonth() === now.getMonth() && next.getFullYear() === now.getFullYear();
    });

    res.json({
      success: true,
      data: {
        patterns,
        summary: {
          totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
          activeCount: patterns.length,
          upcomingThisMonth: upcomingThisMonth.length,
          totalTransactions: patterns.reduce((s, p) => s + p.transactionCount, 0),
        },
      },
    });
  } catch (error) {
    console.error('Recurring detection error:', error);
    res.status(500).json({ success: false, error: 'Failed to detect recurring transactions' });
  }
});

export default router;
