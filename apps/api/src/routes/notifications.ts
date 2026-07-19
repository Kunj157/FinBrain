import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const unreadOnly = req.query.unread === 'true';

  const where: Record<string, unknown> = { userId: req.userId };
  if (unreadOnly) where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId: req.userId, read: false },
    }),
  ]);

  res.json({ success: true, data: { notifications, unreadCount } });
});

router.post('/read', async (req: Request, res: Response) => {
  const schema = z.object({
    ids: z.array(z.string()).optional(),
    all: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input' });
  }

  const { ids, all } = parsed.data;

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true },
    });
  } else if (ids && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: req.userId },
      data: { read: true },
    });
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: req.userId, read: false },
  });

  res.json({ success: true, data: { unreadCount } });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }

  await prisma.notification.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Notification deleted' });
});

export async function checkBudgetAlerts(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: { select: { name: true } } },
  });

  const alerts: Array<{ title: string; message: string; type: string }> = [];

  for (const budget of budgets) {
    const utilization = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    const catName = budget.category?.name || 'Unknown';
    const pct = Math.round(utilization);

    if (utilization >= 100) {
      alerts.push({
        title: `${catName} Budget Exceeded`,
        message: `You've spent ${pct}% of your ${budget.period} ${catName} budget (${budget.spent.toFixed(2)} / ${budget.amount.toFixed(2)}).`,
        type: 'budget_exceeded',
      });
    } else if (utilization >= 90) {
      alerts.push({
        title: `${catName} Budget Warning`,
        message: `You've used ${pct}% of your ${budget.period} ${catName} budget. Only ${(budget.amount - budget.spent).toFixed(2)} remaining.`,
        type: 'budget_warning',
      });
    } else if (utilization >= 75) {
      alerts.push({
        title: `${catName} Budget Alert`,
        message: `You've used ${pct}% of your ${budget.period} ${catName} budget. ${((100 - pct)).toFixed(0)}% remaining.`,
        type: 'budget_alert',
      });
    }
  }

  for (const alert of alerts) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        title: alert.title,
        type: alert.type,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          title: alert.title,
          message: alert.message,
          type: alert.type,
        },
      });
    }
  }

  return alerts;
}

export default router;
