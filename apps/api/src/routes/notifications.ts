import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/unread-count', async (req: Request, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.userId, read: false },
  });
  res.json({ success: true, data: { count } });
});

router.get('/', async (req: Request, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: notifications });
});

router.put('/read-all', async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, read: false },
    data: { read: true },
  });
  res.json({ success: true, data: { count: 0 } });
});

router.put('/:id/read', async (req: Request, res: Response) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!notification) return res.status(404).json({ success: false, error: 'Not found' });

  await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true },
  });
  res.json({ success: true, data: { count: 0 } });
});

export default router;
