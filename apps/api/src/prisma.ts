import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const DEV_USER_ID = 'dev-user-001';

export async function ensureDevUser() {
  const user = await prisma.user.findUnique({ where: { id: DEV_USER_ID } });
  if (!user) {
    await prisma.user.create({
      data: {
        id: DEV_USER_ID,
        clerkId: 'dev-clerk-001',
        email: 'dev@finbrain.local',
        name: 'Kunj Patel',
      },
    });
  }
}
