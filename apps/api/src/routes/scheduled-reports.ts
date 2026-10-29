import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { buildReport } from '../services/report-builder';

const router = Router();

const scheduleSchema = z.object({
  reportType: z.enum(['monthly', 'quarterly', 'annual']),
  email: z.string().email(),
  dayOfMonth: z.number().min(1).max(28).default(1),
  enabled: z.boolean().default(true),
});

// Get user's scheduled reports
router.get('/', async (req: Request, res: Response) => {
  try {
    // Use AuditLog as a simple store for scheduled reports
    const schedules = await prisma.auditLog.findMany({
      where: { userId: req.userId, entity: 'scheduled_report' },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = schedules.map((s) => {
      const details = s.details as Record<string, unknown>;
      return {
        id: s.id,
        reportType: details.reportType,
        email: details.email,
        dayOfMonth: details.dayOfMonth,
        enabled: details.enabled,
        lastSent: details.lastSent,
        createdAt: s.createdAt,
      };
    });

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Get scheduled reports error:', err);
    res.status(500).json({ success: false, error: 'Failed to get scheduled reports' });
  }
});

// Create a scheduled report
router.post('/', async (req: Request, res: Response) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: req.userId,
        action: 'create',
        entity: 'scheduled_report',
        details: {
          ...parsed.data,
          lastSent: null,
        } as never,
      },
    });

    res.json({
      success: true,
      data: {
        id: log.id,
        ...parsed.data,
        lastSent: null,
        createdAt: log.createdAt,
      },
    });
  } catch (err) {
    console.error('Create scheduled report error:', err);
    res.status(500).json({ success: false, error: 'Failed to create scheduled report' });
  }
});

// Toggle scheduled report
router.put('/:id', async (req: Request, res: Response) => {
  const schema = z.object({ enabled: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input' });
  }

  try {
    const existing = await prisma.auditLog.findFirst({
      where: { id: req.params.id, userId: req.userId, entity: 'scheduled_report' },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    const details = existing.details as Record<string, unknown>;
    await prisma.auditLog.update({
      where: { id: req.params.id },
      data: { details: { ...details, enabled: parsed.data.enabled } as never },
    });

    res.json({ success: true, message: 'Schedule updated' });
  } catch (err) {
    console.error('Update scheduled report error:', err);
    res.status(500).json({ success: false, error: 'Failed to update scheduled report' });
  }
});

// Delete scheduled report
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.auditLog.deleteMany({
      where: { id: req.params.id, userId: req.userId, entity: 'scheduled_report' },
    });
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (err) {
    console.error('Delete scheduled report error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete scheduled report' });
  }
});

// Generate report on demand (preview)
router.post('/preview', async (req: Request, res: Response) => {
  const schema = z.object({ reportType: z.enum(['monthly', 'quarterly', 'annual']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input' });
  }

  try {
    const data = await buildReport(prisma, req.userId, parsed.data.reportType);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Preview report error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

export default router;
