import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const membership = await prisma.householdMember.findFirst({
    where: { userId: req.userId, status: 'ACTIVE' },
    include: {
      household: {
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          },
          invites: {
            where: { acceptedAt: null, expiresAt: { gt: new Date() } },
            include: { invitedBy: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!membership) {
    return res.json({ success: true, data: null });
  }

  res.json({ success: true, data: { ...membership.household, myRole: membership.role } });
});

router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({ name: z.string().min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  const existing = await prisma.householdMember.findFirst({
    where: { userId: req.userId, status: 'ACTIVE' },
  });
  if (existing) {
    return res.status(400).json({ success: false, error: 'You already belong to a household' });
  }

  const household = await prisma.household.create({
    data: {
      name: parsed.data.name,
      members: {
        create: { userId: req.userId, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
      },
    },
    include: {
      members: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
    },
  });

  res.json({ success: true, data: { ...household, myRole: 'OWNER' } });
});

router.post('/invite', async (req: Request, res: Response) => {
  const schema = z.object({
    email: z.string().email(),
    householdId: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Valid email and householdId required' });
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId: req.userId, householdId: parsed.data.householdId, status: 'ACTIVE' },
  });
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return res.status(403).json({ success: false, error: 'Only household owners/admins can invite' });
  }

  const memberCount = await prisma.householdMember.count({
    where: { householdId: parsed.data.householdId, status: 'ACTIVE' },
  });
  if (memberCount >= 2) {
    return res.status(400).json({ success: false, error: 'Household already has maximum members (2)' });
  }

  const existingMember = await prisma.householdMember.findFirst({
    where: { householdId: parsed.data.householdId, status: 'ACTIVE' },
    include: { user: { select: { email: true } } },
  });
  if (existingMember && existingMember.user.email === parsed.data.email) {
    return res.status(400).json({ success: false, error: 'This user is already a member' });
  }

  const token = crypto.randomBytes(32).toString('hex');

  const invite = await prisma.householdInvite.create({
    data: {
      email: parsed.data.email,
      token,
      householdId: parsed.data.householdId,
      invitedById: req.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({
    success: true,
    data: { id: invite.id, email: invite.email, token: invite.token, expiresAt: invite.expiresAt },
  });
});

router.post('/join', async (req: Request, res: Response) => {
  const schema = z.object({ token: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }

  const invite = await prisma.householdInvite.findUnique({
    where: { token: parsed.data.token },
    include: { household: true },
  });

  if (!invite) {
    return res.status(404).json({ success: false, error: 'Invalid invite token' });
  }

  if (invite.acceptedAt) {
    return res.status(400).json({ success: false, error: 'Invite already used' });
  }

  if (invite.expiresAt < new Date()) {
    return res.status(400).json({ success: false, error: 'Invite has expired' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.email !== invite.email) {
    return res.status(403).json({ success: false, error: 'This invite was sent to a different email address' });
  }

  const existing = await prisma.householdMember.findFirst({
    where: { userId: req.userId, status: 'ACTIVE' },
  });
  if (existing) {
    return res.status(400).json({ success: false, error: 'You already belong to a household' });
  }

  await prisma.$transaction([
    prisma.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId: req.userId,
        role: invite.role,
        status: 'ACTIVE',
        joinedAt: new Date(),
        invitedById: invite.invitedById,
      },
    }),
    prisma.householdInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  res.json({ success: true, data: { householdId: invite.householdId, name: invite.household.name } });
});

router.patch('/:id', async (req: Request, res: Response) => {
  const schema = z.object({ name: z.string().min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId: req.userId, householdId: req.params.id, status: 'ACTIVE' },
  });
  if (!membership || membership.role !== 'OWNER') {
    return res.status(403).json({ success: false, error: 'Only the household owner can update the name' });
  }

  const household = await prisma.household.update({
    where: { id: req.params.id },
    data: { name: parsed.data.name },
  });

  res.json({ success: true, data: household });
});

router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
  const membership = await prisma.householdMember.findFirst({
    where: { userId: req.userId, householdId: req.params.id, status: 'ACTIVE' },
  });
  if (!membership || membership.role !== 'OWNER') {
    return res.status(403).json({ success: false, error: 'Only the household owner can remove members' });
  }

  const target = await prisma.householdMember.findFirst({
    where: { id: req.params.memberId, householdId: req.params.id },
  });
  if (!target) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }

  if (target.role === 'OWNER') {
    return res.status(400).json({ success: false, error: 'Cannot remove the household owner' });
  }

  await prisma.householdMember.update({
    where: { id: req.params.memberId },
    data: { status: 'LEFT' },
  });

  res.json({ success: true, message: 'Member removed' });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const membership = await prisma.householdMember.findFirst({
    where: { userId: req.userId, householdId: req.params.id, status: 'ACTIVE' },
  });

  if (!membership) {
    return res.status(404).json({ success: false, error: 'Membership not found' });
  }

  if (membership.role === 'OWNER') {
    const memberCount = await prisma.householdMember.count({
      where: { householdId: req.params.id, status: 'ACTIVE' },
    });

    if (memberCount > 1) {
      return res.status(400).json({
        success: false,
        error: 'Transfer ownership or remove all members before deleting the household',
      });
    }

    await prisma.household.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Household deleted' });
  }

  await prisma.householdMember.update({
    where: { id: membership.id },
    data: { status: 'LEFT' },
  });

  res.json({ success: true, message: 'Left household' });
});

export default router;
