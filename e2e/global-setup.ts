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
export default function globalSetup() {
  // Fail loudly: a suite run against an unseeded database produces confusing
  // assertion failures rather than an obvious setup error.
  execFileSync('pnpm', ['--filter', '@finbrain/api', 'seed'], { stdio: 'inherit' });
}
