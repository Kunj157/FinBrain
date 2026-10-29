import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../prisma';
import { sendDueReports } from '../services/report-mailer';

// Exercises the claim-before-send query against Postgres, because the JSON
// path filter it relies on is only meaningful as Prisma really executes it.
const USER_ID = 'test-report-mailer-user';

describe('scheduled report claim (database)', () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: USER_ID },
      update: {},
      create: { id: USER_ID, email: 'report-mailer@test.local', clerkId: 'test-report-mailer-clerk', name: 'Report Mailer' },
    });
    await prisma.auditLog.deleteMany({ where: { userId: USER_ID } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: USER_ID } });
    await prisma.$disconnect();
  });

  it('sends once when two workers race, and not again until the next period', async () => {
    const row = await prisma.auditLog.create({
      data: {
        userId: USER_ID,
        action: 'create',
        entity: 'scheduled_report',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        details: { reportType: 'monthly', email: 'person@example.test', dayOfMonth: 1, enabled: true, lastSent: null },
      },
    });
    const sendMail = vi.fn().mockResolvedValue({});
    const now = new Date('2026-03-02T00:00:00Z');

    // Other tests' schedules may exist in a shared database; only count ours.
    await Promise.all([
      sendDueReports(prisma, { sendMail }, 'r@example.test', now),
      sendDueReports(prisma, { sendMail }, 'r@example.test', now),
    ]);
    const ours = sendMail.mock.calls.filter(([m]) => m.to === 'person@example.test');
    expect(ours).toHaveLength(1);

    const stored = await prisma.auditLog.findUnique({ where: { id: row.id } });
    expect((stored?.details as { lastSent: string }).lastSent).toBe(now.toISOString());

    await sendDueReports(prisma, { sendMail }, 'r@example.test', new Date('2026-03-20T00:00:00Z'));
    expect(sendMail.mock.calls.filter(([m]) => m.to === 'person@example.test')).toHaveLength(1);
  });
});
