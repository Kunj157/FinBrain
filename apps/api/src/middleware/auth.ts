import type { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { prisma } from '../prisma';
import { seedDefaultCategories } from '../seed-defaults';

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    if (process.env.DEV_MODE === 'true') {
      req.userId = 'dev-user-001';
      return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!process.env.CLERK_SECRET_KEY) {
    return res.status(500).json({ success: false, error: 'Clerk not configured' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const clerkUserId = session.sub;

    const existing = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (existing) {
      req.userId = existing.id;
    } else {
      if (!clerkClient) {
        return res.status(500).json({ success: false, error: 'Clerk not configured' });
      }
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown',
          name: clerkUser.fullName || clerkUser.firstName || 'User',
        },
      });
      req.userId = newUser.id;
      await seedDefaultCategories(newUser.id);
    }

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
