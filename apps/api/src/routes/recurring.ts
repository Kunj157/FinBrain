import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma';
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

router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const patterns = await detectRecurring(req.userId);
    const now = new Date();
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const month = parseInt(req.query.month as string) || now.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const calendarEvents = patterns.map((p) => {
      const nextDate = new Date(p.nextExpectedDate);
      let expectedDate = nextDate;

      if (expectedDate < monthStart) {
        const diffMonths = (monthStart.getFullYear() - expectedDate.getFullYear()) * 12 +
          (monthStart.getMonth() - expectedDate.getMonth());
        expectedDate = new Date(nextDate);
        expectedDate.setMonth(expectedDate.getMonth() + diffMonths);
      }

      if (expectedDate > monthEnd) return null;

      return {
        merchant: p.merchant,
        amount: p.amount,
        expectedDate: expectedDate.toISOString().split('T')[0],
        dayOfMonth: expectedDate.getDate(),
        category: p.categoryName,
        cadence: p.frequency,
        isUpcoming: expectedDate >= now && expectedDate <= new Date(now.getTime() + 7 * 86400000),
        isPast: expectedDate < now,
      };
    }).filter(Boolean);

    const dayGroups: Record<number, typeof calendarEvents> = {};
    for (const event of calendarEvents) {
      if (!event) continue;
      const day = event.dayOfMonth;
      if (!dayGroups[day]) dayGroups[day] = [];
      dayGroups[day]!.push(event);
    }

    const totalExpected = calendarEvents.reduce((s, e) => s + (e?.amount || 0), 0);

    res.json({
      success: true,
      data: {
        year,
        month,
        events: calendarEvents,
        dayGroups,
        summary: {
          totalExpected: Math.round(totalExpected * 100) / 100,
          totalBills: calendarEvents.length,
          upcomingWeek: calendarEvents.filter((e) => e?.isUpcoming).length,
        },
      },
    });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate calendar' });
  }
});

router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const patterns = await detectRecurring(req.userId);
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 86400000);

    const upcoming = patterns
      .filter((p) => {
        const next = new Date(p.nextExpectedDate);
        return next >= now && next <= thirtyDaysOut;
      })
      .sort((a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime())
      .map((p) => ({
        merchant: p.merchant,
        amount: p.amount,
        expectedDate: new Date(p.nextExpectedDate).toISOString().split('T')[0],
        daysUntil: Math.ceil((new Date(p.nextExpectedDate).getTime() - now.getTime()) / 86400000),
        category: p.categoryName,
        cadence: p.frequency,
      }));

    const totalDue = upcoming.reduce((s, u) => s + u.amount, 0);

    res.json({
      success: true,
      data: {
        upcoming,
        summary: {
          totalDue30Days: Math.round(totalDue * 100) / 100,
          count: upcoming.length,
          nextPayment: upcoming[0] || null,
        },
      },
    });
  } catch (error) {
    console.error('Upcoming error:', error);
    res.status(500).json({ success: false, error: 'Failed to get upcoming bills' });
  }
});

router.post('/:id/mark-paid', async (req: Request, res: Response) => {
  try {
    const patternId = req.params.id;

    await prisma.transaction.updateMany({
      where: {
        userId: req.userId,
        merchant: { contains: patternId, mode: 'insensitive' },
        isRecurring: true,
      },
      data: { status: 'cleared' },
    });

    res.json({ success: true, message: 'Marked as paid' });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as paid' });
  }
});

export default router;
