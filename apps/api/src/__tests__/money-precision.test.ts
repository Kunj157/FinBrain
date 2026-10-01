import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma, aggregateToNumber } from '../prisma';

const TEST_USER_ID = 'test-money-precision-user';

describe('money precision', () => {
  describe('aggregateToNumber', () => {
    // Aggregates bypass the client's result extension and return Decimal at
    // runtime while TypeScript reports `number`, so the compiler cannot catch
    // an unconverted value. Left alone it reaches res.json and serialises as a
    // string, silently changing the API contract.
    it('converts a Decimal to a number', () => {
      const value = aggregateToNumber(new Prisma.Decimal('1616.95'));
      expect(typeof value).toBe('number');
      expect(value).toBe(1616.95);
    });

    it('serialises as a JSON number, not a string', () => {
      const raw = new Prisma.Decimal('1616.95');
      expect(JSON.stringify({ spent: raw })).toBe('{"spent":"1616.95"}');
      expect(JSON.stringify({ spent: aggregateToNumber(raw) })).toBe('{"spent":1616.95}');
    });

    it('adds rather than concatenates', () => {
      expect(500 + aggregateToNumber(new Prisma.Decimal('1616.95'))).toBe(2116.95);
    });

    it('falls back for null and undefined', () => {
      expect(aggregateToNumber(null)).toBe(0);
      expect(aggregateToNumber(undefined)).toBe(0);
      expect(aggregateToNumber(null, 42)).toBe(42);
    });
  });

  describe('exact decimal storage', () => {
    let categoryId: string;

    beforeAll(async () => {
      await prisma.user.upsert({
        where: { id: TEST_USER_ID },
        update: {},
        create: {
          id: TEST_USER_ID,
          email: 'money-precision@test.local',
          clerkId: 'test-money-precision-clerk',
          name: 'Money Precision Test',
        },
      });
      const category = await prisma.category.create({
        data: { userId: TEST_USER_ID, name: 'Precision Test Category' },
      });
      categoryId = category.id;
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
      await prisma.$disconnect();
    });

    it('sums cents exactly, where double precision would drift', async () => {
      // 0.1 + 0.2 is the canonical float failure: as a double it yields
      // 0.30000000000000004. numeric(19,4) holds the exact decimal value, and
      // Postgres sums it exactly.
      for (const amount of [0.1, 0.2]) {
        await prisma.transaction.create({
          data: {
            userId: TEST_USER_ID,
            categoryId,
            type: 'expense',
            amount,
            description: 'precision probe',
            date: new Date('2026-01-15T00:00:00.000Z'),
          },
        });
      }

      const result = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId: TEST_USER_ID },
      });

      expect(aggregateToNumber(result._sum.amount)).toBe(0.3);
      expect(0.1 + 0.2).not.toBe(0.3); // the behaviour being avoided
    });
  });
});
