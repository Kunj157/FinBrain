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
- CSV/PDF upload option from onboarding and dashboard (only Plaid bank connection remains)
- "Try sample data" button from dashboard empty state

---

## Phase C — Feature Parity Core (COMPLETED)

All 8 features implemented on branch `feat/feature-parity-core`, PR #49 to `dev`. All pass typecheck and lint (0 errors).

### 1. Rollover Budgets
- `apps/api/src/routes/budgets.ts` — `rolloverAmount` field, carried forward each period
- `apps/web/src/pages/budgets.tsx` — rollover toggle, visual indicator

### 2. Budget History
- `apps/api/src/routes/budgets.ts` — `GET /budgets/:id/history` endpoint
- `apps/web/src/pages/budgets.tsx` — history modal with period-by-period breakdown

### 3. Transaction Tags
- `apps/api/src/routes/tags.ts` — full CRUD for tags + transaction-tag assignment
- `apps/web/src/pages/transactions.tsx` — tag assignment UI in transaction form

### 4. Split Transactions
- `apps/api/src/routes/transactions.ts` — `POST /transactions/:id/splits` endpoint
- `apps/web/src/pages/transactions.tsx` — split UI with remainder tracking

### 5. Recurring Pattern Persistence
- `apps/api/src/routes/recurring.ts` — snooze, dismiss, restore, mark-paid endpoints
- `apps/web/src/pages/recurring.tsx` — PatternCard with snooze/dismiss/restore/paid actions
- Separate showSnoozed/showDismissed toggles

### 6. Calendar View
- `apps/web/src/pages/calendar.tsx` — monthly calendar with transaction dots, day detail panel
- Route: `/calendar`

### 7. Custom Date Range
- `apps/web/src/components/ui/date-range-picker.tsx` — DateRangePicker component
- Used in analytics and cash flow pages

### 8. Cash Flow Page
- `apps/web/src/pages/cash-flow.tsx` — income vs expenses bar chart, category breakdown
- Route: `/cash-flow`

---

## Onboarding & Dashboard Redesign (COMPLETED)

### Onboarding — Monarch-style Multi-step Wizard
- **File**: `apps/web/src/pages/onboarding.tsx`
- Step 1 (Welcome): Logo, 3 feature cards (Track net worth, Track spending, Budget smarter), "Get started"
- Step 2 (Connect): Bank search input (triggers Plaid on focus), trust signals (256-bit encryption, Read-only access, Powered by Plaid)
- Step 3 (Done): Success message, "Go to Dashboard"
- Progress bar with numbered steps and checkmarks
- "Skip for now" link on non-done steps
- Removed CSV/PDF upload option — only Plaid remains

### Dashboard Empty State
- **File**: `apps/web/src/pages/dashboard.tsx`
- Clean centered layout with single "Connect your bank" CTA
- Trust signals row below the button
- Removed card grid, removed "Try sample data" button

### Dashboard AI Insights (Dynamic)
- **File**: `apps/web/src/pages/dashboard.tsx`
- Replaced hardcoded fake insights with dynamic computation from actual data
- Shows: spending surges/drops vs last month, top spending category, over-budget alerts, low savings rate warnings
- Falls back to "All looks good!" when no alerts

### Ask FinBrain — Functional Chat
- **File**: `apps/web/src/lib/ai-chat.ts` — shared `generateAnswer` utility
- **Dashboard**: Inline mini-chat with suggested questions that auto-send on click
- **Insights page**: Full chat with suggested questions that auto-send (was previously just filling input without sending)
- Supports questions about: spending, income, savings, budgets, goals, subscriptions, financial tips
- Refactored `handleSend` → `doSend(question)` pattern so chips can send without React state race condition

### Recurring Pattern Restore
- `apps/api/src/routes/recurring.ts` — `POST /recurring/:id/restore` endpoint
- `apps/web/src/pages/recurring.tsx` — `handleRestore`, `onRestore` prop, "Restore" button on hover for dismissed patterns

---

## Config

### OpenCode
- `opencode.json` — ponytail plugin installed (`opencode-ponytail`)
- Restart opencode to activate

---

## Current State / Known Issues

- **Database wiped clean** — all transactions, accounts, tags, splits deleted. Ready for fresh Plaid import.
- `notifications` route referenced in `index.ts` but file doesn't exist — was removed from import and mount.
- `prisma migrate dev` doesn't work in non-interactive mode — use `npx prisma db push` instead.

---

## Next Steps

1. **Re-import German bank statement** — upload `Konto_1011216648-Auszug_2026_0005.PDF` via onboarding page and verify:
   - All 22 transactions parsed correctly
   - Categories resolve to proper DB UUIDs (not "Other")
   - Opening balance appears as Income transaction
   - Dashboard reflects correct monthly totals and balance

2. **Start ML service for transformer predictions** — `python3 -m uvicorn main:app --host 0.0.0.0 --port 8000` (multilingual, higher accuracy than rule-based)

3. **Verify layout** — confirm CSV import preview table fills full width on-screen

4. **Test user corrections pipeline** — corrections saved to `user_corrections.jsonl` should feed into future transformer retraining

5. **Consider retraining** — with more real-world German data, the Bills & Utilities (69.4%) and Other (71.4%) categories could improve

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
- `apps/api/src/routes/transactions.ts` — `catByName` map, name-based category fallback, splits
- `apps/api/src/routes/recurring.ts` — snooze, dismiss, restore, mark-paid endpoints
- `apps/api/src/routes/tags.ts` — tag CRUD + transaction-tag assignment
- `apps/api/src/routes/budgets.ts` — rollover budgets, budget history
- `apps/api/src/services/auto-categorize.ts` — 100+ German keywords, merchant-name boost
- `apps/api/src/services/pdf-parser.ts` — German bank statement parser, opening balance extraction

### Web
- `apps/web/src/pages/onboarding.tsx` — Monarch-style multi-step wizard, Plaid-only
- `apps/web/src/pages/transactions.tsx` — full-width table, tag assignment, split UI
- `apps/web/src/pages/dashboard.tsx` — dynamic insights, functional Ask FinBrain chat, Plaid modal
- `apps/web/src/pages/insights.tsx` — health score, AI insights, Ask FinBrain full chat
- `apps/web/src/pages/calendar.tsx` — monthly calendar with transaction dots
- `apps/web/src/pages/cash-flow.tsx` — income vs expenses bar chart
- `apps/web/src/pages/recurring.tsx` — pattern management with snooze/dismiss/restore
- `apps/web/src/pages/budgets.tsx` — rollover budgets, history modal
- `apps/web/src/lib/ai-chat.ts` — shared `generateAnswer` utility for dashboard + insights
- `apps/web/src/components/finance/csv-import.tsx` — import preview with opening balance
- `apps/web/src/components/finance/charts.tsx` — normalized date keys for SpendingTrend
- `apps/web/src/components/ui/date-range-picker.tsx` — custom date range picker
- `apps/web/src/components/ui/input.tsx` — styled input component
- `apps/web/src/components/layout/app-layout.tsx` — sidebar + content layout

### Config
- `opencode.json` — ponytail plugin
- `docker-compose.yml` — host data volume mount for ml-service
- `apps/ml-service/requirements.txt` — updated to `>=` format
- `.npmrc` — updated

---

## Git Commit Rules

### Co-author Format
When committing, do NOT add any co-authors. The only author should be Kunj157. Specifically, do not add yourself or any other entity as a co-author.

### Commit Message Guidelines
- Keep commit messages concise and descriptive
- Use imperative mood (e.g., "Add", "Fix", "Update", "Remove")
- Explain what was changed and why, not how
- Limit to one logical change per commit
- Reference related issues/PRs when applicable
