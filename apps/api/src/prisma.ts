import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Money is stored as `numeric(19,4)` so Postgres holds exact decimal values
 * and SQL aggregates are exact — `double precision` cannot represent cents
 * exactly and drifts across large sums.
 *
 * Prisma surfaces those columns as `Decimal` objects, which would change the
 * shape of every API response: `JSON.stringify` renders a Decimal as a string,
 * and `a + b` silently concatenates rather than adding. Rather than push that
 * through 300-odd call sites and the whole web client, the boundary sits here
 * — reads come back as `number`, exactly as before.
 *
 * Writes are unaffected: Prisma accepts a plain number for a Decimal column.
 *
 * Only true currency amounts appear below. Ratios, confidence scores and share
 * quantities stay Float, where binary floating point is the right choice.
 *
 * This is written out field by field rather than generated in a loop on
 * purpose: a dynamically built extension erases the computed return types, so
 * TypeScript would keep seeing Decimal everywhere and the safety would be lost.
 */
function toNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toNullableNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function createClient() {
  return new PrismaClient().$extends({
  result: {
    user: {
      monthlyIncome: {
        needs: { monthlyIncome: true },
        compute(record): number | null {
          return toNullableNumber(record.monthlyIncome);
        },
      },
    },
    account: {
      balance: {
        needs: { balance: true },
        compute(record): number {
          return toNumber(record.balance);
        },
      },
    },
    transaction: {
      amount: {
        needs: { amount: true },
        compute(record): number {
          return toNumber(record.amount);
        },
      },
    },
    budget: {
      amount: {
        needs: { amount: true },
        compute(record): number {
          return toNumber(record.amount);
        },
      },
      spent: {
        needs: { spent: true },
        compute(record): number {
          return toNumber(record.spent);
        },
      },
      remaining: {
        needs: { remaining: true },
        compute(record): number | null {
          return toNullableNumber(record.remaining);
        },
      },
      rolloverAmount: {
        needs: { rolloverAmount: true },
        compute(record): number {
          return toNumber(record.rolloverAmount);
        },
      },
    },
    budgetHistory: {
      amount: {
        needs: { amount: true },
        compute(record): number {
          return toNumber(record.amount);
        },
      },
      spent: {
        needs: { spent: true },
        compute(record): number {
          return toNumber(record.spent);
        },
      },
      remaining: {
        needs: { remaining: true },
        compute(record): number | null {
          return toNullableNumber(record.remaining);
        },
      },
    },
    goal: {
      targetAmount: {
        needs: { targetAmount: true },
        compute(record): number {
          return toNumber(record.targetAmount);
        },
      },
      currentAmount: {
        needs: { currentAmount: true },
        compute(record): number {
          return toNumber(record.currentAmount);
        },
      },
    },
    goalContribution: {
      amount: {
        needs: { amount: true },
        compute(record): number {
          return toNumber(record.amount);
        },
      },
    },
    recommendation: {
      amount: {
        needs: { amount: true },
        compute(record): number | null {
          return toNullableNumber(record.amount);
        },
      },
    },
    receipt: {
      amount: {
        needs: { amount: true },
        compute(record): number | null {
          return toNullableNumber(record.amount);
        },
      },
    },
    holding: {
      avgCostBasis: {
        needs: { avgCostBasis: true },
        compute(record): number {
          return toNumber(record.avgCostBasis);
        },
      },
      currentPrice: {
        needs: { currentPrice: true },
        compute(record): number | null {
          return toNullableNumber(record.currentPrice);
        },
      },
    },
    advisorProfile: {
      monthlyIncomeAvg: {
        needs: { monthlyIncomeAvg: true },
        compute(record): number {
          return toNumber(record.monthlyIncomeAvg);
        },
      },
      monthlyExpenseAvg: {
        needs: { monthlyExpenseAvg: true },
        compute(record): number {
          return toNumber(record.monthlyExpenseAvg);
        },
      },
    },
    spendingPattern: {
      avgAmount: {
        needs: { avgAmount: true },
        compute(record): number {
          return toNumber(record.avgAmount);
        },
      },
      minAmount: {
        needs: { minAmount: true },
        compute(record): number | null {
          return toNullableNumber(record.minAmount);
        },
      },
      maxAmount: {
        needs: { maxAmount: true },
        compute(record): number | null {
          return toNullableNumber(record.maxAmount);
        },
      },
      monthAvg: {
        needs: { monthAvg: true },
        compute(record): number | null {
          return toNullableNumber(record.monthAvg);
        },
      },
    },
    budgetPlan: {
      incomePlan: {
        needs: { incomePlan: true },
        compute(record): number | null {
          return toNullableNumber(record.incomePlan);
        },
      },
    },
    recurringPattern: {
      amountAvg: {
        needs: { amountAvg: true },
        compute(record): number {
          return toNumber(record.amountAvg);
        },
      },
      amountLast: {
        needs: { amountLast: true },
        compute(record): number | null {
          return toNullableNumber(record.amountLast);
        },
      },
    },
  },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Model types as the extended client actually returns them — monetary fields
 * are `number`, not `Decimal`.
 *
 * Import these rather than the raw types from `@prisma/client`, which still
 * describe the database representation and will not match anything the client
 * hands back.
 */
export type Transaction = Prisma.Result<typeof prisma.transaction, object, 'findFirstOrThrow'>;
export type Account = Prisma.Result<typeof prisma.account, object, 'findFirstOrThrow'>;
export type Budget = Prisma.Result<typeof prisma.budget, object, 'findFirstOrThrow'>;
export type Goal = Prisma.Result<typeof prisma.goal, object, 'findFirstOrThrow'>;
export type GoalContribution = Prisma.Result<typeof prisma.goalContribution, object, 'findFirstOrThrow'>;
export type Holding = Prisma.Result<typeof prisma.holding, object, 'findFirstOrThrow'>;

/**
 * Coerce a Prisma aggregate result to a number.
 *
 * The result extension above only covers model *records*. Aggregates
 * (`_sum`, `_avg`, `_min`, `_max`) bypass it and hand back a `Decimal` at
 * runtime — while TypeScript, reading the extended model type, reports them as
 * `number`. The compiler therefore cannot catch this, and an unconverted value
 * reaches `res.json` and serialises as a string, quietly changing the API
 * contract.
 */
export function aggregateToNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  return value instanceof Prisma.Decimal ? value.toNumber() : Number(value);
}

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
