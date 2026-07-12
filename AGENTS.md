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
- 10 categories: Food & Drink, Shopping, Transport, Bills & Utilities, Entertainment, Healthcare, Education, Housing, Income and Other

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

## Current State / Known Issues

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
- `apps/api/src/routes/transactions.ts` — `catByName` map, name-based category fallback
- `apps/api/src/services/auto-categorize.ts` — 100+ German keywords, merchant-name boost
- `apps/api/src/services/pdf-parser.ts` — German bank statement parser, opening balance extraction
- `apps/api/src/routes/seed.ts` — simplified (delete/bulk/ml-categorizer only)

### Web
- `apps/web/src/pages/onboarding.tsx` — import flow, `max-w-7xl` for CSV step
- `apps/web/src/pages/transactions.tsx` — full-width table, removed sample data button
- `apps/web/src/pages/dashboard.tsx` — dynamic month from most recent transaction
- `apps/web/src/components/finance/csv-import.tsx` — import preview with opening balance
- `apps/web/src/components/finance/charts.tsx` — normalized date keys for SpendingTrend
- `apps/web/src/components/layout/app-layout.tsx` — sidebar + content layout

### Config
- `docker-compose.yml` — host data volume mount for ml-service
- `apps/ml-service/requirements.txt` — updated to `>=` format
- `.npmrc` — updated
