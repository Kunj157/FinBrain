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
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    console.warn(`[auth] Missing token from ${ip}`);
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!process.env.CLERK_SECRET_KEY || !clerkClient) {
    return res.status(500).json({ success: false, error: 'Authentication not configured' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const clerkUserId: string = session.sub;

    let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown',
          name: clerkUser.fullName || clerkUser.firstName || 'User',
        },
      });
      await seedDefaultCategories(user.id);
    }

    req.userId = user.id;
    next();
  } catch (error) {
    console.error('[auth] JWT verification failed:', error instanceof Error ? error.message : error);
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
}
