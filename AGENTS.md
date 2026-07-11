# Development Workflow Rules (for AI agents)

## Git & Branch Strategy

1. **Default branch** is `main` — only production-stable, released code lives here.

2. **Working branch** is `dev` — the latest codebase state. All feature/fix branches are created from and merged into `dev`.

3. **Branch naming convention**:
   - `feature/<description>` — for new features
   - `fix/<description>` — for bug fixes
   - `hotfix/<description>` — for urgent production fixes
   - `patch/<description>` — for patches

4. **Sequential commits** — never commit all changes at once. Make granular, well-scoped commits with detailed, descriptive messages.

5. **Pull request workflow**:
   - From a feature/fix branch → PR into `dev`
   - When all planned work for a milestone is complete and tested on `dev` → PR from `dev` to `main`
   - After merging into `main`, create an **automated versioned release** by reading the version from the top of `CHANGELOG.md`

6. **Release reminder** — when a set of features is complete and `dev` is ready to merge into `main`, the AI agent **must remind** the user so they can create the PR and release.

## Issue Tracking

1. **Create a GitHub issue** for every bug found or feature requested — whether identified by the user or discovered during development.

2. **Reference the issue** in the branch name and in commit messages (e.g. `fix: add onboarding link to sidebar (#1)`).

3. **Link the issue** in the PR description using GitHub's closing keywords (e.g. `Closes #1`). Note: auto-close only triggers when merging into the **default branch** (`main`). For PRs into `dev`, close the issue manually after merge with a comment referencing the PR.

4. **Close issues only via PR merge (to main) or manual close (to dev)** — never close without a code change. This ensures the fix is always traceable to the issue.

## Development Rules

1. **Test before delivering** — Always verify fixes work by running the dev server and testing in a real browser before presenting to the user. Never deliver untested changes. Read the code end-to-end, understand the full impact, and if uncertain, start the server and verify.

2. **Root cause, not symptoms** — When a UI bug is reported, trace the full chain (CSS → component → parent → global styles) before suggesting fixes. Don't patch symptoms — find the actual root cause first.

3. **Kill dev servers after testing** — After starting `pnpm dev` to test changes, you **must** kill all running instances (API on port 4000, web on ports 5173/5174) before finishing. The user runs the dev server themselves. Use `lsof -ti:<port> | xargs kill -9` to clean up. Never leave orphan processes blocking ports.

## Work State

### Completed
- Phase 2 (Data Ingestion) fully implemented: multi-currency, auto-categorization, CSV duplicate detection, receipt OCR, DevBank SDK, settings page, onboarding flow with sidebar link
- v0.2.0 released on main with automated CI release workflow
- CI fixed: pnpm version conflict resolved, `require()` → ES imports, test script no-op, release job has `permissions: contents: write`, docker job has `continue-on-error: true`
- Backend CRUD routes: `apps/api/src/routes/transactions.ts` + `apps/api/src/routes/categories.ts`, mounted in `apps/api/src/index.ts`
- **Frontend:** Full transactions page (`/transactions`) with search, filter (type/category/payment method), sort (date/merchant/amount), pagination, bulk select/delete, and modal form for create/edit
- **Frontend:** Categories management page (`/categories`) with add/edit/delete, color picker, icon selector
- **Frontend:** Dashboard charts (`/dashboard`) — Income vs Expenses (bar), Spending by Category (donut), Spending Trend (30-day line)
- Route `/categories` and sidebar link added
- TypeScript typecheck + ESLint pass clean on both web and api
- **PDF parsing:** Rewrote PDF parser to handle German Sparkasse bank statements (DD.MM.YYYY, comma decimals, multi-line descriptions, right-aligned amounts)
- **Unified import endpoint:** `/import/parse` auto-detects CSV vs PDF; backward-compatible `/import/csv` preserved
- **PDF parsing bugs fixed:** amount sign stripped (all showed income), `www.` regex too aggressive, date `\b` too strict, case-sensitive `.PDF` vs `.pdf`
- **VITE_API_URL/CORS fix:** `.env` had `VITE_API_URL=http://localhost:4000/api/v1` which bypassed Vite proxy and caused CORS "Network Error" when accessing app from network IP (`192.168.x.x:5173`). Removed from `.env` so requests go through same-origin proxy.
- **axios Content-Type fix:** removed explicit `Content-Type: application/json` default header that prevented FormData file uploads (multer saw no file)
- **Merged to dev via PR #10** — branch `feature/transactions-crud` merged into `dev`
- **v0.3.0 released to main via PR #11** — CI auto-created the GitHub release
- **Frontend wired to API** — all CRUD pages use API instead of localStorage, merged via PR #13
- **Plaid auto-sync** — after connecting a bank, transactions are automatically fetched and saved

### Active
- No active feature branch
- **Database persistence** — migrated all routes from in-memory arrays to Prisma/PostgreSQL
- **UI polish** — card hover effects, category icons, pagination, sticky table headers, confirmation dialogs

## Next Move
1. ~~Wire frontend CRUD pages to API endpoints~~ ✅
2. Add seed data command or UI for generating sample transactions
3. Build budgets, goals, analytics pages if needed