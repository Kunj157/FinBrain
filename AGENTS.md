# Agent Instructions

- Always kill dev servers after testing (`kill $(lsof -t -i :4000) 2>/dev/null; kill $(lsof -t -i :5173) 2>/dev/null`). Never leave them running.

- AGENTS.md is local-only and must NEVER be pushed to `dev` or `main` branches. It belongs only on feature branches for agent context.

---

## Project Overview

FinBrain is a full-stack AI-powered personal finance tracker. Monorepo with `apps/web` (React/Vite), `apps/api` (Express/Prisma), `apps/ml-service` (Python/FastAPI), and `packages/shared`.

---

## Hardware Constraints

- **GPU**: NVIDIA MX350 (2GB VRAM) — too small for GPU training, use CPU
- **CPU**: Intel i5-1135G7 (8 threads)
- **RAM**: 15GB
- **PyTorch**: CPU-only (`torch-2.13.0+cpu`) installed via `--user --break-system-packages`
- **ML service runs on port 8000**, API on 4000, web on 5173

---

## Git Workflow

### Branching Convention
- All feature branches created from `dev`
- Naming: `feature/*`, `fix/*`, `feat/*`
- PR to `dev` → merge → delete branch
- `main` is stable releases only (empty until first release)

### Current Branch State
- **Branch**: `feat/quality-polish-phase1`
- **Open PR**: #48 → `dev` (quality & accessibility polish Phases 1-3)
- **Untracked files**: `apps/ml-service/data/merged_training_data.csv`, `docker/` (not part of PR)

### Rule
- AGENTS.md is **local-only** — never push to `dev` or `main`

---

## What Was Built (ML Pipeline)

### Training Data
- Generated 10,197 multilingual samples via `apps/ml-service/scripts/generate_training_data.py`
- Created 4K balanced subset at `apps/ml-service/data/train_4k.csv`
- 10 categories: Food & Drink, Shopping, Transport, Bills & Utilities, Entertainment, Healthcare, Education, Housing, Income, Other

### Trained Model
- **XLM-RoBERTa-base** fine-tuned for transaction classification
- **86.5% test accuracy, 86.34% F1**
- Saved to `apps/ml-service/data/xlmr_model/`
- Metrics at `apps/ml-service/data/training_metrics.json`

### Per-Category F1
| Category | F1 |
|---|---|
| Healthcare | 98.8% |
| Education | 95.1% |
| Food & Drink | 93.5% |
| Transport | 92.7% |
| Shopping | 91.1% |
| Housing | 87.8% |
| Entertainment | 87.2% |
| Income | 76.3% |
| Other | 71.4% |
| Bills & Utilities | 69.4% |

### ML Service API (`apps/ml-service/`)
- `POST /categorize` — batch predict (transformer primary, sklearn fallback, `source` field in response)
- `POST /categorize/text` — raw freeform text categorization
- `POST /categorize/batch` — bulk predictions with name-based category fallback
- `GET /model` — model info (accuracy, F1, category IDs)
- `POST /train` — retrain endpoint

### Data Path Fix
- `DATA_DIR` in `classifier.py` and `categorizer.py` auto-detects: `/app/data` in Docker, `../../data` locally
- Docker compose mounts `./apps/ml-service/data:/app/data`

---

## What Was Fixed (German Bank Statement Support)

### PDF Parser (`apps/api/src/services/pdf-parser.ts`)
- Extracts `Anfangsbestand`/`Saldo` as opening balance
- Returns `{ transactions, openingBalance }`
- Handles DD.MM.YYYY dates, comma-decimal amounts, German types (Lastschrift, Überweisung)

### Auto-Categorize (`apps/api/src/services/auto-categorize.ts`)
- 100+ German keywords (aldi, rewe, lidl, tankstelle, miete, gehalt, apotheke, etc.)
- Merchant-name matches boosted (+10 score) over description matches
- Income category added

### Category Resolution (Critical Bug Fix)
- DB category IDs are **UUIDs** (Prisma/PostgreSQL), not hardcoded strings
- `apps/api/src/routes/import.ts`: `resolveCategoryId()` resolves names to UUIDs via `catByName` map
- `apps/api/src/routes/transactions.ts`: `catByName` map with name-based fallback before "Other"
- Opening balance included as synthetic "Income" transaction for correct dashboard balance

### PDF Import Fix
- Removed `.slice(0, 10)` from both `/parse` and `/csv` endpoints (was only returning first 10 transactions)

### Dashboard Fix (`apps/web/src/pages/dashboard.tsx`)
- Monthly stats use most recent transaction's month instead of hardcoded calendar month

### Chart Fix (`apps/web/src/components/finance/charts.tsx`)
- `SpendingTrend` normalized `txn.date` ISO string to `YYYY-MM-DD` for day key lookup

### Soft Dependencies
- `pytesseract` in `receipts.py` — server starts without OCR installed

---

## What Was Removed

- "Generate Sample Data" button from transactions page
- `apps/web/src/lib/sample-data.ts` (deleted)
- `apps/api/src/routes/devbank.ts` (deleted) and its route mounting in `index.ts`
- Seed generator POST route from `apps/api/src/routes/seed.ts`
- All test/sample transactions deleted from DB (clean slate for re-import)

---

## Quality & Accessibility Polish (Phases 1-3) — In PR #48

### Phase 1 — Foundation Quality ✅

**Toast notification system (`sonner`)**
- Installed `sonner` package, added `<Toaster />` to `App.tsx`
- Replaced ALL silent `catch {}` blocks with `toast.error()`/`toast.success()` across: accounts, budgets, goals, categories, transactions, settings, dashboard
- Affected files: `accounts.tsx`, `budgets.tsx`, `goals.tsx`, `categories.tsx`, `transactions.tsx`, `settings.tsx`, `dashboard.tsx`

**Shared Input/Textarea components**
- Created `apps/web/src/components/ui/input.tsx` and `textarea.tsx`
- Consistent glass-morphism styling across all forms
- Used in: accounts, budgets, goals, categories, transactions, settings

**Fix hover-only action buttons**
- Added `opacity-0 group-hover:opacity-100 focus-within:opacity-100` on edit/delete buttons in budgets, goals, categories
- Buttons now visible and keyboard-accessible (not just on mouse hover)

**Fix hardcoded `$` bug**
- `apps/web/src/pages/accounts.tsx`: replaced all hardcoded `$` with `formatCurrency(acct.balance, currency)`
- Currency now respects user preference from Settings

**Form validation with inline errors**
- Added inline error messages with `AlertTriangle` icon to all forms: accounts, budgets, goals, categories, transactions
- Errors appear below the invalid field when user clicks Save with empty required fields

**Dashboard dead code removal**
- Removed stale "Try sample data" card, `seeding` state, `Database` import
- Simplified `handleGetStarted` function

### Phase 2 — Modal & Accessibility ✅

**Dialog focus trap + ARIA**
- Rewrote `apps/web/src/components/ui/dialog.tsx` with `useRef` focus management
- Tab cycling within modal, Escape to close, `role="dialog"`, `aria-modal="true"`
- Focus returns to triggering element on close (`previousFocusRef`)

**Search modal ARIA + focus trap**
- Rewrote `apps/web/src/components/search/search-modal.tsx`
- Added `role="dialog"`, `role="listbox"`, `role="option"`, `aria-selected`, `aria-label`, `aria-expanded`
- Focus trap, keyboard navigation, animation

**Icon button ARIA**
- All icon-only buttons in `header.tsx` (theme toggle, sign out, menu, notifications) now have `aria-label`
- `sidebar.tsx` has `role="navigation"` and `aria-label="Main navigation"`

**Charts accessibility**
- All 3 chart components in `charts.tsx` wrapped in `<div role="img" aria-label="...">`
- Charts: IncomeExpense, Category, SpendingTrend

**Sidebar cleanup**
- Removed duplicate "Ask FinBrain" CTA card (was redundant with "AI Insights" nav item)
- Removed unused imports (`Coins`, `Lightbulb`)

**Notification bell fix**
- Removed false-positive red dot that showed even with zero notifications

### Phase 3 — Perceived Performance ✅

**Skeleton loaders**
- Created `apps/web/src/components/ui/skeleton.tsx` with 4 components: `Skeleton`, `StatCardSkeleton`, `CardSkeleton`, `TableSkeleton`, `GridSkeleton`
- Dashboard: 5 stat cards + 2 card skeletons during load
- Transactions: table skeleton with 8 rows, 8 columns
- Budgets: 6-card grid skeleton
- Goals: 4-card grid skeleton

### Files Changed (Phase 1-3)
```
Modified:  apps/web/package.json, apps/web/src/App.tsx
Modified:  apps/web/src/components/ui/dialog.tsx
Modified:  apps/web/src/components/search/search-modal.tsx
Modified:  apps/web/src/components/layout/header.tsx
Modified:  apps/web/src/components/layout/sidebar.tsx
Modified:  apps/web/src/components/finance/charts.tsx
Modified:  apps/web/src/pages/accounts.tsx, budgets.tsx, categories.tsx
Modified:  apps/web/src/pages/dashboard.tsx, goals.tsx, settings.tsx
Modified:  apps/web/src/pages/transactions.tsx
Modified:  docs/PHASES.md, README.md, pnpm-lock.yaml
New:       apps/web/src/components/ui/input.tsx
New:       apps/web/src/components/ui/textarea.tsx
New:       apps/web/src/components/ui/skeleton.tsx
```

---

## All Pages & Features

### Pages (all 16 are fully built)

| Page | Route | Description |
|------|-------|-------------|
| home.tsx | `/` | Marketing landing page (hero, features, CTA, footer); redirects to /dashboard if signed in |
| dashboard.tsx | `/dashboard` | Main dashboard: stat cards, income-vs-expenses chart, category chart, spending trend, recent transactions, AI insights, Plaid/CSV import modals |
| transactions.tsx | `/transactions` | Full CRUD: paginated table, search/filter/sort, bulk select+delete, inline create/edit modal, skeleton loading, toasts |
| categories.tsx | `/categories` | Category management: grid display, create/edit modal with color picker and icon selector |
| budgets.tsx | `/budgets` | Budgets: summary cards, progress bars, over-budget alerts, create/edit modal, period support |
| goals.tsx | `/goals` | Goals: summary stats, expandable cards, progress bars, deadline tracking, contribution history, add-funds modal |
| accounts.tsx | `/accounts` | Accounts: net worth summary, NetWorthTrend chart, account card grid (7 types), create modal |
| analytics.tsx | `/analytics` | Analytics: 4 time periods, bar/line charts, day-of-week spending, category breakdown, top merchants |
| reports.tsx | `/reports` | Reports: monthly/quarterly/annual, period navigation, stat cards with period-over-period change, CSV export, print |
| insights.tsx | `/insights` | AI insights: financial health score (0-100), dynamic insight generation, "Ask FinBrain" chat interface |
| receipts.tsx | `/receipts` | Receipt OCR: drag-and-drop upload, OCR extraction, results card with save |
| recurring.tsx | `/recurring` | Recurring transactions: patterns, summary, due-date tracking, history expand |
| rules.tsx | `/rules` | Categorization rules: rule list, active/inactive toggle, create/delete |
| settings.tsx | `/settings` | Profile, currency selector (7 currencies), CSV export, account deletion with confirmation |
| help.tsx | `/help` | Quick-start guide, 8 FAQ items, GitHub link, keyboard shortcuts |
| onboarding.tsx | `/onboarding` | Multi-step: welcome → Plaid sandbox → CSV upload → completion redirect |

### UI Components (`apps/web/src/components/ui/`)
| Component | File | Description |
|-----------|------|-------------|
| Avatar | avatar.tsx | User avatar with fallback initials |
| Badge | badge.tsx | Status/category badge |
| Button | button.tsx | Variants: default, destructive, outline, ghost, link |
| Card | card.tsx | Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter |
| Dialog | dialog.tsx | Radix Dialog with focus trap, ARIA, Escape close |
| DOB Selector | dob-selector.tsx | Date of birth picker |
| Input | input.tsx | Shared text input with glass styling |
| Select | select.tsx | Radix Select dropdown |
| Skeleton | skeleton.tsx | Loading skeletons (stat card, table, grid) |
| Textarea | textarea.tsx | Shared textarea with glass styling |

### Finance Components (`apps/web/src/components/finance/`)
| Component | File | Description |
|-----------|------|-------------|
| Charts | charts.tsx | IncomeExpense, Category, SpendingTrend (Chart.js) |
| CsvImport | csv-import.tsx | CSV upload with preview table, opening balance |
| NetWorthTrend | net-worth-trend.tsx | Net worth over time chart |
| PlaidLink | plaid-link.tsx | Plaid sandbox bank connection |
| StatCard | stat-card.tsx | Dashboard stat card with icon, value, change |

### Layout Components (`apps/web/src/components/layout/`)
| Component | File | Description |
|-----------|------|-------------|
| AppLayout | app-layout.tsx | Sidebar + content area |
| Header | header.tsx | Top bar: search, notifications, theme toggle, sign out |
| Sidebar | sidebar.tsx | Navigation with icons, AI Insights link |

### Search (`apps/web/src/components/search/`)
| Component | File | Description |
|-----------|------|-------------|
| SearchModal | search-modal.tsx | Cmd+K global search with ARIA |

---

## API Routes (`apps/api/src/routes/`)

| Route | File | Description |
|-------|------|-------------|
| `/api/v1/auth/*` | auth.ts | Clerk auth, dev-user fallback, profile |
| `/api/v1/accounts/*` | accounts.ts | Account CRUD, net worth |
| `/api/v1/budgets/*` | budgets.ts | Budget CRUD |
| `/api/v1/categories/*` | categories.ts | Category CRUD |
| `/api/v1/goals/*` | goals.ts | Goal CRUD, contributions |
| `/api/v1/transactions/*` | transactions.ts | Transaction CRUD, bulk, search, `catByName` map |
| `/api/v1/import/*` | import.ts | PDF/CSV parse, category UUID resolution, opening balance |
| `/api/v1/plaid/*` | plaid.ts | Plaid sandbox link, transactions |
| `/api/v1/receipts/*` | receipts.ts | Receipt OCR (pytesseract) |
| `/api/v1/recurring/*` | recurring.ts | Recurring transaction detection |
| `/api/v1/rules/*` | rules.ts | Categorization rules CRUD |
| `/api/v1/search` | search.ts | Global search across transactions |
| `/api/v1/seed` | seed.ts | Seed data (delete/bulk/ml-categorizer) |
| `/api/v1/currency/*` | currency.ts | Currency conversion |
| `/health` | health.ts | Health check endpoint |

### ML Service Routes (`apps/ml-service/`)
| Route | Description |
|-------|-------------|
| `POST /categorize` | Batch predict (transformer → sklearn fallback) |
| `POST /categorize/text` | Freeform text categorization |
| `POST /categorize/batch` | Bulk predictions with name fallback |
| `GET /model` | Model info (accuracy, F1, categories) |
| `POST /train` | Retrain endpoint |

---

## Current State / Known Issues

### Open PR
- **PR #48**: `feat/quality-polish-phase1` → `dev` — quality & accessibility polish (Phases 1-3)
- All typecheck, build, lint pass

### Layout Fix (Onboarding CSV Import)
- **Fixed**: Onboarding page `max-w-2xl` → `max-w-7xl` when CSV step is active
- **Fixed**: Removed extra `glass rounded-xl p-6` wrapper around `CsvImport` component
- **Fixed**: Onboarding page uses top-alignment (`flex-col pt-8`) instead of centering during CSV step
- The CSV import preview table now stretches edge-to-edge within a wide container

### Transactions Page Table
- **Fixed**: `Card` now has `className="p-0"` to remove card padding
- `CardHeader` has `className="p-5 pb-3"` for filter row padding
- Table stretches full width within the content area

### No Auto-Categorization in Bulk Endpoint
- `apps/api/src/routes/transactions.ts` bulk endpoint: `catByName.get(item.category)` checks if category name matches a DB category UUID before falling back to "Other"

### Untracked Files (not part of PR)
- `apps/ml-service/data/merged_training_data.csv` — ML training data
- `docker/` — Docker config files

---

## What Is Pending

### Must Do Before Merge
- [ ] Review PR #48 locally: verify all quality polish changes work
- [ ] Test all 11 manual test scenarios (see "How to Test" below)
- [ ] Merge PR #48 to `dev`

### Remaining Quality Work (Phase 3 incomplete)
- [ ] Optimistic updates across all pages (show change immediately, rollback on error)
- [ ] Page transitions (framer-motion fade/slide between routes)
- [ ] Notification bell with real unread count (currently just icon, no data)

### Feature Parity Gaps vs Monarch Money (Phase 4)
- [ ] Rollover budgets (carry unused budget to next month)
- [ ] Spending forecast (predict future spending based on history)
- [ ] Calendar view (transactions on a calendar)
- [ ] Dashboard customization (widget reorder/hide)
- [ ] Transaction review queue (flagged transactions for review)
- [ ] Goal → account linking (tie goal to specific account)
- [ ] Investment detail view (stock/crypto portfolio)
- [ ] Monthly review card (AI-generated monthly summary)

### Landing Page Polish (Phase 5)
- [ ] Scroll-reveal animations (framer-motion `whileInView`)
- [ ] Fix dead CTA links on landing page
- [ ] Remove dead code from landing

### ML Pipeline
- [ ] Re-import German bank statement via onboarding page
- [ ] Start ML service for transformer predictions: `python3 -m uvicorn main:app --host 0.0.0.0 --port 8000`
- [ ] Test user corrections pipeline (`user_corrections.jsonl`)
- [ ] Consider retraining with more real-world German data (Bills & Utilities 69.4%, Other 71.4%)

### Infrastructure
- [ ] Docker Compose full-stack testing
- [ ] Environment variable documentation completeness

---

## How to Test

### Start Dev Servers
```bash
pnpm dev
# Web: http://localhost:5173
# API: http://localhost:4000
```

### Quality Checks
```bash
pnpm run typecheck        # TypeScript — 0 errors
pnpm run lint             # ESLint — 0 errors
pnpm --filter @finbrain/web build  # Vite build — ~7s
```

### Kill Servers After Testing
```bash
kill $(lsof -t -i :5173) 2>/dev/null
kill $(lsof -t -i :4000) 2>/dev/null
```

### Manual Test Checklist (Quality Polish)

| # | What to Test | How | Expected |
|---|-------------|-----|----------|
| 1 | **Toast: create account** | Accounts → Create → fill → Save | Green success toast bottom-right |
| 2 | **Toast: delete goal** | Goals → delete icon → confirm | Green success toast |
| 3 | **Validation: empty budget** | Budgets → Add Budget → Save (no data) | Red inline error below fields |
| 4 | **Validation: empty transaction** | Transactions → Add → Save (no data) | Red inline errors on Description, Amount, Date |
| 5 | **Hover-fix: keyboard nav** | Tab through budget/goal/category cards | Edit/Delete buttons visible on focus |
| 6 | **Currency: EUR** | Settings → switch to EUR → Accounts | Amounts show €, not $ |
| 7 | **Focus trap: modal** | Open any Add modal → Tab repeatedly | Focus stays inside modal; Escape closes |
| 8 | **Search ARIA** | Ctrl+K → type → arrow keys | Results navigate with aria-selected |
| 9 | **Skeleton loaders** | Refresh dashboard | Skeleton cards appear before data loads |
| 10 | **Bell: no false dot** | Header notification bell | No red dot when no notifications |
| 11 | **Sidebar: no duplicate** | Sidebar | "AI Insights" nav item only, no CTA card below |

---

## Conventions & Patterns

### Frontend
- **UI library**: shadcn/ui primitives + custom glass-morphism components
- **Styling**: Tailwind CSS with CSS variables for dark-emerald theme (`index.css`)
- **State**: TanStack Query for server state, React `useState`/`useEffect` for UI state
- **Routing**: React Router v6, all protected routes inside `<AppLayout />`
- **Forms**: shared `Input`/`Textarea` components + inline validation + toast feedback
- **Modals**: Radix Dialog (`dialog.tsx`) with focus trap and ARIA
- **Charts**: Chart.js via `react-chartjs-2`
- **Auth**: Clerk `<AuthProvider>` wraps app; `<ProtectedRoute>` wraps protected routes

### Backend
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma with PostgreSQL
- **Auth**: Clerk JWT verification; dev fallback when `CLERK_SECRET_KEY` absent
- **Routes**: `req.userId` from Clerk or `dev-user-001` fallback
- **Category resolution**: `catByName` map resolves category names → DB UUIDs

### ML Service
- **Framework**: FastAPI (Python)
- **Primary model**: XLM-RoBERTa (transformer)
- **Fallback**: scikit-learn TF-IDF + LogisticRegression
- **Data**: `DATA_DIR` auto-detects Docker vs local path

---

## Key File Reference

### ML Service
- `apps/ml-service/src/services/classifier.py` — XLM-RoBERTa classifier with `DATA_DIR` auto-detection
- `apps/ml-service/src/services/categorizer.py` — sklearn fallback with `DATA_DIR` auto-detection
- `apps/ml-service/src/routes/categorize.py` — unified prediction pipeline, `/text`, `/batch`, `/train`
- `apps/ml-service/src/main.py` — model info endpoints, `DATA_DIR` import
- `apps/ml-service/data/xlmr_model/` — trained model files

### API
- `apps/api/src/routes/import.ts` — PDF/CSV parse, category UUID resolution, opening balance
- `apps/api/src/routes/transactions.ts` — `catByName` map, name-based category fallback
- `apps/api/src/services/auto-categorize.ts` — 100+ German keywords, merchant-name boost
- `apps/api/src/services/pdf-parser.ts` — German bank statement parser, opening balance extraction
- `apps/api/src/routes/seed.ts` — simplified (delete/bulk/ml-categorizer only)

### Web — Quality Polish Files
- `apps/web/src/components/ui/dialog.tsx` — Radix Dialog with focus trap, ARIA
- `apps/web/src/components/ui/input.tsx` — shared Input component
- `apps/web/src/components/ui/textarea.tsx` — shared Textarea component
- `apps/web/src/components/ui/skeleton.tsx` — Skeleton, StatCardSkeleton, TableSkeleton, GridSkeleton
- `apps/web/src/components/search/search-modal.tsx` — Cmd+K search with ARIA, focus trap
- `apps/web/src/components/layout/header.tsx` — ARIA labels on icon buttons
- `apps/web/src/components/layout/sidebar.tsx` — role="navigation", removed duplicate CTA
- `apps/web/src/components/finance/charts.tsx` — role="img" + aria-label on all charts
- `apps/web/src/App.tsx` — Toaster (sonner) provider

### Web — Pages
- `apps/web/src/pages/dashboard.tsx` — dynamic month, skeleton loader, dead code removed
- `apps/web/src/pages/transactions.tsx` — full CRUD, skeleton loader, toasts, form validation
- `apps/web/src/pages/accounts.tsx` — formatCurrency fix, toasts, skeleton
- `apps/web/src/pages/budgets.tsx` — hover-fix, skeleton, toasts, form validation
- `apps/web/src/pages/goals.tsx` — hover-fix, skeleton, toasts, form validation
- `apps/web/src/pages/categories.tsx` — hover-fix, toasts, form validation
- `apps/web/src/pages/settings.tsx` — toasts, shared Input
- `apps/web/src/pages/onboarding.tsx` — import flow, `max-w-7xl` for CSV step
- `apps/web/src/components/finance/csv-import.tsx` — import preview with opening balance
- `apps/web/src/components/layout/app-layout.tsx` — sidebar + content layout

### Config
- `docker-compose.yml` — host data volume mount for ml-service
- `apps/ml-service/requirements.txt` — updated to `>=` format
- `.npmrc` — updated
