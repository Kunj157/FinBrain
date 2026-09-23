import { execFileSync } from 'node:child_process';

/**
 * Seed the dev user before the suite runs.
 *
 * The specs assert on real figures (analytics totals, advisor confidence), so
 * they need a known dataset rather than whatever happens to be in the local
 * database.
 *
 * Note: the seed script deletes and recreates transactions for `dev-user-001`
 * only. It does not touch any other user's data.
 */
// Budgets are created by the suite itself, and the app only offers categories
// that are not already budgeted. Left to accumulate, the budget spec runs out
// of selectable categories and starts failing against a database that has
// simply been tested against too often — which is what happened locally, while
// CI stayed green because it starts from an empty database every run.
//
// Scoped to the dev user, like the seed step above it.
const CLEAR_DEV_USER_BUDGETS = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.budget
  .deleteMany({ where: { userId: 'dev-user-001' } })
  .then(({ count }) => console.log('Cleared ' + count + ' dev-user budgets'))
  .finally(() => prisma.$disconnect());
`;

export default function globalSetup() {
  // Fail loudly: a suite run against an unseeded database produces confusing
  // assertion failures rather than an obvious setup error.
  execFileSync('pnpm', ['--filter', '@finbrain/api', 'seed'], { stdio: 'inherit' });

  execFileSync('node', ['-e', CLEAR_DEV_USER_BUDGETS], {
    cwd: 'apps/api',
    stdio: 'inherit',
  });
}
