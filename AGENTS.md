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

## Completed Phases

### Phase 1 — Foundation ✅
- Monorepo, Auth (Clerk), Prisma schema, Docker Compose, CI/CD

### Phase 2 — Data Ingestion ✅
- Plaid integration, CSV import, PDF parser (German banks), Receipt OCR, Multi-currency

### Phase 3 — Finance Core ✅
- Transaction CRUD, Categories, Dashboard charts, Analytics, Goals, Budgets, Recurring detection

### Additional Completed Features
- Budget threshold alerts (75/90/100%) with visual indicators
- Goal auto-contribute from income + contribution progress chart
- Analytics category and type filters
- Net worth trend chart with period selector
- Global search (Cmd+K)
- Mobile responsive layout with hamburger menu
- Public landing page
- Auth redirect fixes, account deletion UX

---

## Current Development Roadmap

**Reference**: `docs/FEATURE_ROADMAP.md` — Feature gap analysis vs Industry Standard Money

### Wave 1 — Close Critical Gaps (COMPLETED)

1. **LLM AI Assistant** ✅ — Replace keyword matching with OpenAI/Claude integration
   - Context Engine: `/api/v1/ai/context` endpoint with full financial snapshot
   - LLM Integration: OpenAI API with structured system prompt
   - Decision Interface: "Can I afford X?" with impact analysis
   - Files: `apps/api/src/routes/ai.ts`, `apps/web/src/lib/ai-chat.ts`, `apps/web/src/pages/insights.tsx`, `apps/web/src/pages/dashboard.tsx`
   - Requires: `OPENAI_API_KEY` environment variable

2. **Investment Holdings** ✅ — Portfolio tracking with market data
   - Prisma models: Portfolio, Holding (with allocation, gain/loss tracking)
   - API routes: CRUD for portfolios and holdings, summary endpoint
   - Portfolio UI with allocation charts, gain/loss visualization
   - Files: `apps/api/src/routes/investments.ts`, `apps/web/src/pages/investments.tsx`
   - Requires: `npx prisma db push` to create tables

3. **Budget Alerts** ✅ — Wire Notification model, threshold triggers
   - Notification CRUD routes with read/unread state
   - Budget threshold detection (75%, 90%, 100%)
   - In-app notification bell with dropdown, mark all read
   - Files: `apps/api/src/routes/notifications.ts`, `apps/web/src/components/notifications.tsx`

### Wave 2 — Forecasting & Analytics (COMPLETED)

1. **ML Forecasting** ✅ — Prophet, ARIMA, Linear Regression, Moving Average endpoints
   - ML service: `apps/ml-service/src/services/forecast.py`, `apps/ml-service/src/routes/forecast.py`
   - API proxy: `apps/api/src/routes/forecast.ts` with local fallback when ML service is down
   - Frontend: `apps/web/src/pages/forecasting.tsx` — model comparison table, bar visualizations, 3/6/12-month projections
   - All four models return forecast arrays + MAPE accuracy scores

2. **Sankey Diagrams** ✅ — Money flow visualization on reports page
   - Component: `apps/web/src/components/finance/sankey.tsx` using @nivo/sankey
   - Income → Expense category flow, color-coded proportional links

3. **PDF Report Export** ✅ — Client-side PDF generation
   - Uses jsPDF + jspdf-autotable (no server-side dependencies)
   - Reports include: summary stats, category breakdown table, top merchants, full transaction list
   - File: `apps/web/src/pages/reports.tsx` (exportPDF function)

4. **Cash Flow Projection** ✅ — Recurring-aware, months-ahead forecasting
   - Fetches recurring patterns from `/api/v1/recurring`
   - Separates fixed recurring expenses from variable spending
   - Shows 30/60/90-day projections + 6-month bar visualization
   - File: `apps/web/src/pages/analytics.tsx` (enhanced cashFlowForecast section)

### Wave 3 — Feature Parity
- Couples/Household (multi-user, shared budgets)
- Credit Score tracking
- Recurring Calendar View
- Flex Budgeting (three-bucket mode)

### Wave 4 — Polish & Mobile
- Notification Center
- Customizable Dashboard (drag-and-drop)
- Tax Summary Report
- Scheduled Reports (email)
- Mobile Apps (React Native/Capacitor)

---

## Current State / Known Issues

- **Database wiped clean** — ready for fresh Plaid import
- `prisma migrate dev` doesn't work in non-interactive mode — use `npx prisma db push` instead
- Phase C features (tags, splits, calendar, cash-flow, ai-chat, date-range-picker) were built on `feat/feature-parity-core` but removed on current branch — will rebuild as part of Wave 1-4

---

## Key File Reference

### ML Service
- `apps/ml-service/src/services/classifier.py` — XLM-RoBERTa classifier with `DATA_DIR` auto-detection
- `apps/ml-service/src/services/categorizer.py` — sklearn fallback with `DATA_DIR` auto-detection
- `apps/ml-service/src/services/forecast.py` — Prophet, ARIMA, Linear Regression, Moving Average forecasting
- `apps/ml-service/src/routes/categorize.py` — unified prediction pipeline, `/text`, `/batch`, `/train`
- `apps/ml-service/src/routes/forecast.py` — forecasting endpoints: `/forecast`, `/forecast/monthly-series`
- `apps/ml-service/src/main.py` — model info endpoints, `DATA_DIR` import, route mounting
- `apps/ml-service/data/xlmr_model/` — trained model files

### API
- `apps/api/src/routes/import.ts` — PDF/CSV parse, category UUID resolution, opening balance
- `apps/api/src/routes/transactions.ts` — `catByName` map, name-based category fallback
- `apps/api/src/routes/budgets.ts` — budget CRUD with threshold alerts
- `apps/api/src/routes/goals.ts` — goal CRUD with auto-contribute
- `apps/api/src/routes/ai.ts` — LLM chat with financial context, context endpoint
- `apps/api/src/routes/investments.ts` — portfolio and holdings CRUD, summary
- `apps/api/src/routes/notifications.ts` — notification CRUD, budget alert checking
- `apps/api/src/routes/forecast.ts` — forecast proxy to ML service with local fallback
- `apps/api/src/services/auto-categorize.ts` — 100+ German keywords, merchant-name boost
- `apps/api/src/services/pdf-parser.ts` — German bank statement parser, opening balance extraction
- `apps/api/src/scripts/recategorize.ts` — standalone script to re-categorize all user transactions

### Web
- `apps/web/src/pages/onboarding.tsx` — standard multi-step wizard, Plaid-only
- `apps/web/src/pages/transactions.tsx` — full-width table with filters
- `apps/web/src/pages/dashboard.tsx` — dynamic insights, stat cards, charts
- `apps/web/src/pages/insights.tsx` — health score, AI insights, rule-based chat
- `apps/web/src/pages/budgets.tsx` — budget CRUD with threshold alerts
- `apps/web/src/pages/goals.tsx` — goal CRUD with auto-contribute
- `apps/web/src/pages/analytics.tsx` — category and type filters, recurring-aware cash flow projection
- `apps/web/src/pages/investments.tsx` — portfolio tracking with holdings
- `apps/web/src/pages/forecasting.tsx` — ML forecasting page with model comparison
- `apps/web/src/pages/reports.tsx` — reports with Sankey diagrams and PDF export
- `apps/web/src/lib/ai-chat.ts` — LLM chat utility for dashboard + insights
- `apps/web/src/components/notifications.tsx` — notification bell with dropdown
- `apps/web/src/components/finance/sankey.tsx` — Sankey money flow diagram component
- `apps/web/src/components/layout/app-layout.tsx` — sidebar + content layout

### Config
- `docker-compose.yml` — host data volume mount for ml-service

---

## Session: Jul 19, 2026

### What Changed
1. **Auto-categorize rewrite** — Keywords always win (confidence 1.0), ML only fallback. Removed `lastschrift`/`überweisung`/`abbuchung` from Bills & Utilities (payment types, not categories). Removed `müller` from Food & Drink/Shopping (common surname), replaced with ` müller drogerie`. Added `sentics gmbh` to Income. Added word-boundary regex for single-word keywords.
2. **AI Assistant: Groq integration** — Replaced OpenAI-only with Groq (free, no credit card, 30 RPM). Model: `llama-3.1-8b-instant`. Fallback: OpenAI if `OPENAI_API_KEY` set. Requires `GROQ_API_KEY` in `apps/api/.env`. Updated frontend error messages.
3. **Negative expense bug fix** — Expenses stored as negative amounts caused wrong calculations across 7 files (`insights.tsx`, `dashboard.tsx`, `analytics.tsx`, `charts.tsx`, `reports.tsx`, `ai.ts`). Fixed by wrapping expense `.reduce()` with `Math.abs()`. Health score jumped from 23/100 to ~62/100.
4. **Re-categorize script** — `apps/api/src/scripts/recategorize.ts` and `POST /api/v1/seed/re-categorize` endpoint for bulk re-categorization. Fixed 3 transactions (ottonova→Healthcare, Feather→Healthcare, Müller rent→Housing).
5. **Wave 2: ML Forecasting** — `apps/ml-service/src/services/forecast.py` and `routes/forecast.py` with Prophet, ARIMA, Linear Regression, Moving Average. API proxy at `apps/api/src/routes/forecast.ts`. Frontend at `apps/web/src/pages/forecasting.tsx`.
6. **Wave 2: Sankey Diagrams** — `apps/web/src/components/finance/sankey.tsx` using @nivo/sankey. Added to Reports page showing Income → Expense category flow.
7. **Wave 2: PDF Export** — jsPDF + jspdf-autotable client-side PDF generation in `apps/web/src/pages/reports.tsx` (exportPDF function).
8. **Wave 2: Cash Flow Projection** — Enhanced `apps/web/src/pages/analytics.tsx` with recurring-aware projections, 6-month bar visualization, recurring/variable expense breakdown.

### Current State
- **DB user**: `cmrrhyuev0000zr4iocg75ayg` (Clerk user with 22 transactions from May 2026)
- **Dev user**: `dev-user-001` (empty, used when CLERK_SECRET_KEY unset)
- **AI**: Groq configured, working. Dev server: `kill $(lsof -t -i :4000) 2>/dev/null`
- **Build status**: API and Web both pass `tsc --noEmit`

### Known Issues
- All 22 transactions from May only → consistency score is low (11/110 days)
- No budgets or goals set → those default to 50%
- ML service not running → keyword-only classification

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
