/**
 * Populate the public demo account.
 *
 * A fresh production database is empty and production auth is fail-closed, so
 * a visitor following the demo link would otherwise sign in and find empty
 * states everywhere. This fills one specific account with a plausible six
 * months of history, so the dashboard, analytics, budgets, goals and the
 * advisor all have something real to work with.
 *
 * Usage:
 *   DATABASE_URL=... DEMO_USER_EMAIL=demo@example.com \
 *   DEMO_SEED_CONFIRM=demo@example.com pnpm --filter @finbrain/api seed:demo
 *
 * It is destructive for that one account and nothing else: the confirmation
 * has to match the target email, which is the guard against pointing it at a
 * real user. Re-running it replaces the demo data rather than duplicating it,
 * so it is safe to use as a scheduled reset.
 *
 * The Clerk user must already exist — the API creates the matching row on
 * first sign-in, and this script will not invent an identity nobody can log
 * in as.
 */

import { PrismaClient, type Currency, type PaymentMethod } from '@prisma/client';
import { seedDefaultCategories } from '../seed-defaults';

const prisma = new PrismaClient();

const SPEND: Record<string, { merchants: string[]; descs: string[]; min: number; max: number }> = {
  'Food & Drink': {
    merchants: ['Whole Foods', 'Trader Joe’s', 'Pret a Manger', 'Dishoom', 'Blue Bottle'],
    descs: ['Weekly shop', 'Lunch', 'Coffee', 'Dinner with friends', 'Groceries'],
    min: 6, max: 140,
  },
  Transport: {
    merchants: ['Uber', 'Shell', 'Deutsche Bahn', 'TfL', 'Lime'],
    descs: ['Ride home', 'Fuel', 'Monthly pass', 'Airport transfer'],
    min: 3, max: 95,
  },
  Housing: {
    merchants: ['Property Management Co.', 'E.ON', 'Thames Water'],
    descs: ['Rent', 'Electricity', 'Water', 'Maintenance'],
    min: 40, max: 1600,
  },
  Entertainment: {
    merchants: ['Spotify', 'Netflix', 'Steam', 'Cineworld'],
    descs: ['Subscription', 'Film tickets', 'Game'],
    min: 8, max: 65,
  },
  Shopping: {
    merchants: ['Amazon', 'IKEA', 'Uniqlo', 'Decathlon'],
    descs: ['Household items', 'Clothing', 'Running shoes', 'Desk lamp'],
    min: 12, max: 320,
  },
  Healthcare: {
    merchants: ['Boots Pharmacy', 'City Dental', 'PureGym'],
    descs: ['Prescription', 'Check-up', 'Gym membership'],
    min: 10, max: 180,
  },
};

const INCOME = [
  { merchant: 'Acme Corp', desc: 'Monthly salary', min: 4200, max: 4600, currency: 'USD' as Currency },
  { merchant: 'Freelance Client', desc: 'Consulting invoice', min: 400, max: 1800, currency: 'EUR' as Currency },
  { merchant: 'Airbnb', desc: 'Rental income', min: 150, max: 700, currency: 'GBP' as Currency },
];

const PAYMENT_METHODS: PaymentMethod[] = ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'upi'];

// Deterministic, so re-seeding produces the same demo rather than a different
// story every time someone opens the link.
let seed = 1337;
function rand(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function amount(min: number, max: number): number {
  return Math.round((min + rand() * (max - min)) * 100) / 100;
}

async function main(): Promise<void> {
  const email = process.env.DEMO_USER_EMAIL?.trim();
  const confirm = process.env.DEMO_SEED_CONFIRM?.trim();

  if (!email) {
    throw new Error('Set DEMO_USER_EMAIL to the account to populate.');
  }
  if (confirm !== email) {
    throw new Error(
      `DEMO_SEED_CONFIRM must equal DEMO_USER_EMAIL. This deletes every transaction, ` +
        `account, budget and goal belonging to ${email}, so it asks you to name the ` +
        `target twice rather than take it from a single mistyped variable.`,
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      `No user with email ${email}. Sign in once as the demo user first — the API ` +
        `creates the account record on first sign-in, and seeding an identity nobody ` +
        `can log in as would produce a demo nobody can open.`,
    );
  }

  console.log(`Seeding demo data for ${email} (${user.id})`);

  await seedDefaultCategories(user.id);
  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const byName = new Map(categories.map((c) => [c.name, c.id]));
  // 'Other' rather than categories[0]: the first default category is Income,
  // so a name that failed to match used to file an expense as income instead
  // of showing up as a problem.
  const fallbackCategory = byName.get('Other');
  if (!fallbackCategory) throw new Error('No categories available to attach transactions to.');

  // Every name used below must exist, or the demo silently misreports itself.
  const required = [...Object.keys(SPEND), 'Income', 'Housing', 'Other'];
  const missing = required.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(
      `These categories are referenced by the demo seed but not created by ` +
        `seedDefaultCategories: ${missing.join(', ')}.`,
    );
  }

  // Scoped to this user alone, and ordered so nothing is deleted while still
  // referenced.
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.goalContribution.deleteMany({ where: { goal: { userId: user.id } } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });

  await prisma.account.createMany({
    data: [
      { name: 'Everyday Checking', type: 'checking', balance: 4820.55, currency: 'USD', institution: 'First National', userId: user.id },
      { name: 'Emergency Savings', type: 'savings', balance: 11200.0, currency: 'USD', institution: 'First National', userId: user.id },
      { name: 'Travel Card', type: 'credit', balance: -742.18, currency: 'EUR', institution: 'N26', userId: user.id },
      { name: 'Brokerage', type: 'investment', balance: 18640.3, currency: 'USD', institution: 'Vanguard', userId: user.id },
    ],
  });

  const now = new Date();
  const rows: Array<Record<string, unknown>> = [];

  // Six months back, so month-over-month comparisons and the recurring
  // detector have enough history to say anything.
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);

    for (const stream of INCOME) {
      rows.push({
        type: 'income',
        amount: amount(stream.min, stream.max),
        currency: stream.currency,
        description: stream.desc,
        merchant: stream.merchant,
        categoryId: byName.get('Income') ?? fallbackCategory,
        paymentMethod: 'bank_transfer' as PaymentMethod,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + Math.floor(rand() * 3)),
        status: 'cleared',
        isRecurring: true,
        userId: user.id,
      });
    }

    // A fixed monthly rent, so the recurring detector has an obvious pattern.
    rows.push({
      type: 'expense',
      amount: 1450,
      currency: 'USD' as Currency,
      description: 'Rent',
      merchant: 'Property Management Co.',
      categoryId: byName.get('Housing') ?? fallbackCategory,
      paymentMethod: 'bank_transfer' as PaymentMethod,
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 2),
      status: 'cleared',
      isRecurring: true,
      userId: user.id,
    });

    for (let i = 0; i < 18; i++) {
      const categoryName = pick(Object.keys(SPEND));
      const profile = SPEND[categoryName];
      const day = 1 + Math.floor(rand() * 27);
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (date > now) continue;

      rows.push({
        type: 'expense',
        amount: amount(profile.min, profile.max),
        // A deliberate minority of non-USD rows: the whole currency-conversion
        // story is invisible in a single-currency demo.
        currency: (rand() < 0.22 ? pick(['EUR', 'GBP', 'INR'] as const) : 'USD') as Currency,
        description: pick(profile.descs),
        merchant: pick(profile.merchants),
        categoryId: byName.get(categoryName) ?? fallbackCategory,
        paymentMethod: pick(PAYMENT_METHODS),
        date,
        status: 'cleared',
        isRecurring: false,
        userId: user.id,
      });
    }
  }

  await prisma.transaction.createMany({ data: rows as never });

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  for (const [name, budget] of [
    ['Food & Drink', 650],
    ['Transport', 220],
    ['Entertainment', 120],
    ['Shopping', 400],
  ] as const) {
    const categoryId = byName.get(name);
    if (!categoryId) continue;
    await prisma.budget.create({
      data: {
        amount: budget,
        currency: 'USD',
        period: 'monthly',
        startDate: monthStart,
        categoryId,
        userId: user.id,
      },
    });
  }

  await prisma.goal.createMany({
    data: [
      { name: 'Emergency fund', targetAmount: 15000, currentAmount: 11200, currency: 'USD', goalType: 'emergency_fund', icon: 'shield', deadline: new Date(now.getFullYear() + 1, 5, 1), userId: user.id },
      { name: 'Japan trip', targetAmount: 4000, currentAmount: 1450, currency: 'USD', goalType: 'travel', icon: 'plane', deadline: new Date(now.getFullYear() + 1, 2, 15), userId: user.id },
      { name: 'New laptop', targetAmount: 2200, currentAmount: 1800, currency: 'USD', goalType: 'purchase', icon: 'laptop', deadline: new Date(now.getFullYear(), now.getMonth() + 3, 1), userId: user.id },
    ],
  });

  const [txns, accounts, budgets, goals] = await Promise.all([
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.account.count({ where: { userId: user.id } }),
    prisma.budget.count({ where: { userId: user.id } }),
    prisma.goal.count({ where: { userId: user.id } }),
  ]);

  console.log(
    `Done: ${txns} transactions, ${accounts} accounts, ${budgets} budgets, ${goals} goals.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
