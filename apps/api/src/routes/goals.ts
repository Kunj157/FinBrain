import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { type Goal, type GoalContribution } from '@prisma/client';
import { prisma } from '../prisma';

const router = Router();

const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']).default('USD'),
  deadline: z.string().optional(),
  goalType: z.string().default('custom'),
  icon: z.string().default('target'),
  categoryId: z.string().optional(),
});

const updateGoalSchema = createGoalSchema.partial();

const createContributionSchema = z.object({
  amount: z.number().positive(),
  date: z.string().optional(),
  notes: z.string().max(255).optional(),
});

const querySchema = z.object({
  goalType: z.string().optional(),
  sort: z.enum(['name', 'targetAmount', 'currentAmount', 'deadline', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

type GoalWithProgress = Goal & {
  contributions: GoalContribution[];
  progress: number;
  remaining: number;
  onTrack: boolean;
  daysLeft: number | null;
};

function computeGoalProgress(goal: Goal & { contributions: GoalContribution[] }): GoalWithProgress {
  const totalContributions = goal.contributions.reduce((sum, c) => sum + c.amount, 0);
  const currentAmount = goal.currentAmount || totalContributions;
  const progress = goal.targetAmount > 0 ? Math.min((currentAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = Math.max(goal.targetAmount - currentAmount, 0);

  let daysLeft: number | null = null;
  let onTrack = true;

  if (goal.deadline) {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    daysLeft = Math.max(Math.ceil((deadline.getTime() - now.getTime()) / 86400000), 0);

    if (daysLeft > 0 && currentAmount < goal.targetAmount) {
      const totalDays = Math.ceil((deadline.getTime() - goal.createdAt.getTime()) / 86400000);
      const elapsedDays = totalDays - daysLeft;
      const expectedProgress = (elapsedDays / totalDays) * 100;
      onTrack = progress >= expectedProgress;
    } else if (currentAmount >= goal.targetAmount) {
      onTrack = true;
    } else {
      onTrack = false;
    }
  }

  return { ...goal, currentAmount, progress, remaining, onTrack, daysLeft };
}

router.get('/', async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid query', details: parsed.error.format() });
  }

  const { goalType, sort, order } = parsed.data;

  const goals = await prisma.goal.findMany({
    where: {
      userId: req.userId,
      ...(goalType && { goalType }),
    },
    include: { contributions: { orderBy: { date: 'desc' } } },
    orderBy: { [sort]: order },
  });

  const enriched = goals.map(computeGoalProgress);

  res.json({ success: true, data: enriched });
});

router.get('/:id', async (req: Request, res: Response) => {
  const goal = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { contributions: { orderBy: { date: 'desc' } } },
  });
  if (!goal) return res.status(404).json({ success: false, error: 'Goal not found' });

  res.json({ success: true, data: computeGoalProgress(goal) });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const goal = await prisma.goal.create({
    data: {
      userId: req.userId,
      name: parsed.data.name,
      targetAmount: parsed.data.targetAmount,
      currency: parsed.data.currency,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      goalType: parsed.data.goalType,
      icon: parsed.data.icon,
      categoryId: parsed.data.categoryId || null,
    },
    include: { contributions: true },
  });

  res.status(201).json({ success: true, data: computeGoalProgress(goal) });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Goal not found' });

  const parsed = updateGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name) updateData.name = parsed.data.name;
  if (parsed.data.targetAmount) updateData.targetAmount = parsed.data.targetAmount;
  if (parsed.data.currency) updateData.currency = parsed.data.currency;
  if (parsed.data.deadline !== undefined) updateData.deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  if (parsed.data.goalType) updateData.goalType = parsed.data.goalType;
  if (parsed.data.icon) updateData.icon = parsed.data.icon;
  if (parsed.data.categoryId !== undefined) updateData.categoryId = parsed.data.categoryId || null;

  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: updateData,
    include: { contributions: { orderBy: { date: 'desc' } } },
  });

  res.json({ success: true, data: computeGoalProgress(goal) });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Goal not found' });

  await prisma.goal.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Goal deleted' });
});

router.post('/:id/contributions', async (req: Request, res: Response) => {
  const goal = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!goal) return res.status(404).json({ success: false, error: 'Goal not found' });

  const parsed = createContributionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const contribution = await prisma.goalContribution.create({
    data: {
      goalId: goal.id,
      amount: parsed.data.amount,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      notes: parsed.data.notes || null,
    },
  });

  const newCurrentAmount = goal.currentAmount + parsed.data.amount;
  await prisma.goal.update({
    where: { id: goal.id },
    data: { currentAmount: newCurrentAmount },
  });

  const updatedGoal = await prisma.goal.findFirst({
    where: { id: goal.id },
    include: { contributions: { orderBy: { date: 'desc' } } },
  });

  res.status(201).json({ success: true, data: { contribution, goal: updatedGoal ? computeGoalProgress(updatedGoal) : null } });
});

router.delete('/:id/contributions/:contributionId', async (req: Request, res: Response) => {
  const goal = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!goal) return res.status(404).json({ success: false, error: 'Goal not found' });

  const contribution = await prisma.goalContribution.findFirst({
    where: { id: req.params.contributionId, goalId: goal.id },
  });
  if (!contribution) return res.status(404).json({ success: false, error: 'Contribution not found' });

  await prisma.goalContribution.delete({ where: { id: req.params.contributionId } });

  const newCurrentAmount = Math.max(goal.currentAmount - contribution.amount, 0);
  await prisma.goal.update({
    where: { id: goal.id },
    data: { currentAmount: newCurrentAmount },
  });

  const updatedGoal = await prisma.goal.findFirst({
    where: { id: goal.id },
    include: { contributions: { orderBy: { date: 'desc' } } },
  });

  res.json({ success: true, data: { goal: updatedGoal ? computeGoalProgress(updatedGoal) : null } });
});

export default router;
