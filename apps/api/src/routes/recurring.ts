import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma';
import { detectRecurring } from '../services/recurring-detector';

const router = Router();

async function checkBillReminders(userId: string) {
  const patterns = await detectRecurring(userId);
  const now = new Date();
  const alerts: Array<{ title: string; message: string; type: string }> = [];

  for (const p of patterns) {
    const nextDate = new Date(p.nextExpectedDate);
    const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000);

    if (daysUntil >= 0 && daysUntil <= 3) {
      alerts.push({
        title: `Upcoming: ${p.merchant}`,
        message: `${p.merchant} (${p.amount.toFixed(2)}) is due in ${daysUntil === 0 ? '1 day' : `${daysUntil} days`}.`,
        type: 'bill_reminder',
      });
    }

    if (daysUntil < -7) {
      alerts.push({
        title: `Missed: ${p.merchant}`,
        message: `${p.merchant} (${p.amount.toFixed(2)}) was expected ${Math.abs(daysUntil)} days ago and hasn't been marked as paid.`,
        type: 'missed_payment',
      });
    }
  }

  for (const alert of alerts) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        title: alert.title,
        type: alert.type,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: { userId, title: alert.title, message: alert.message, type: alert.type },
      });
    }
  }
  return alerts;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const patterns = await detectRecurring(req.userId);

    const totalMonthlyCost = patterns.reduce((s, p) => s + p.monthlyCost, 0);
    const upcomingThisMonth = patterns.filter(p => {
      const next = new Date(p.nextExpectedDate);
      const now = new Date();
      return next.getMonth() === now.getMonth() && next.getFullYear() === now.getFullYear();
    });

    try { await checkBillReminders(req.userId); } catch { /* best-effort */ }

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

router.get('/reminders', async (req: Request, res: Response) => {
  try {
    const alerts = await checkBillReminders(req.userId);
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Reminders error:', error);
    res.status(500).json({ success: false, error: 'Failed to check reminders' });
  }
});

router.post('/:id/dismiss-reminder', async (req: Request, res: Response) => {
  try {
    const pattern = req.params.id;
    const existing = await prisma.notification.findFirst({
      where: {
        userId: req.userId,
        title: { contains: pattern },
        type: { in: ['bill_reminder', 'missed_payment'] },
      },
    });
    if (existing) {
      await prisma.notification.update({ where: { id: existing.id }, data: { read: true } });
    }
    res.json({ success: true, message: 'Reminder dismissed' });
  } catch (error) {
    console.error('Dismiss reminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to dismiss reminder' });
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
