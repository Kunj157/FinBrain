<div align="center">
  <br/>
  <img src="apps/web/public/favicon.svg" width="64" height="64" alt="FinBrain Logo"/>
  <h1 align="center">FinBrain</h1>
  <p align="center">
    <strong>AI-Powered Personal Finance Co-Pilot</strong>
  </p>
  <p align="center">
    A production-ready, cloud-native personal finance dashboard that combines modern full-stack development,
    machine learning, and data visualization into a single portfolio-quality application.
  </p>
  <br/>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white" alt="Prisma"/>
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white" alt="pnpm"/>
</div>

---

## Overview

FinBrain is a full-stack AI-powered personal finance tracker built as a monorepo. It combines ML-powered transaction categorization (XLM-RoBERTa, 86.5% accuracy), an LLM financial advisor (Groq/OpenAI), German bank PDF parsing, investment portfolio tracking, and a glass-morphism dark UI into a single application.

### Core Philosophy

- **AI-first categorization** — XLM-RoBERTa transformer with 100+ keyword fallback, not rigid rule sets
- **Personal financial advisor** — LLM answers questions with reasoning based on your complete financial context
- **Data-first onboarding** — Import via Plaid, CSV, or German bank PDFs before anything else
- **Adaptive budgets** — Learn from your spending, alert at thresholds, rollover support

### Key Features

| Feature | Status |
|---------|--------|
| Secure Authentication (Clerk) | ✅ Done |
| Dashboard & Summary Cards | ✅ Done |
| Bank Integration (Plaid Sandbox) | ✅ Done |
| CSV & PDF Import (German banks) | ✅ Done |
| Receipt OCR (Tesseract) | ✅ Done |
| Multi-Currency Support (7 currencies) | ✅ Done |
| Transaction CRUD, Search, Filters, Bulk Ops | ✅ Done |
| ML Auto-Categorization (XLM-RoBERTa, 86.5% accuracy) | ✅ Done |
| Category Management with Icons & Colors | ✅ Done |
| Adaptive Budgets with Rollover & Alerts (75/90/100%) | ✅ Done |
| Savings Goals with Auto-Contribute & Projections | ✅ Done |
| Analytics (category/type filters, merchants, day-of-week) | ✅ Done |
| Reports (monthly/quarterly/annual, CSV export) | ✅ Done |
| AI Assistant (Groq/OpenAI, financial context reasoning) | ✅ Done |
| Investment Portfolio & Holdings Tracking | ✅ Done |
| Notification System (bell, mark read) | ✅ Done |
| Recurring Transaction Detection | ✅ Done |
| Net Worth Tracking with Historical Trends | ✅ Done |
| Global Search (Cmd+K) | ✅ Done |
| Financial Health Score | ✅ Done |
| ML Forecasting (Prophet, ARIMA, Linear Regression, Moving Average) | ✅ Done |
| Sankey Diagrams (money flow visualization) | ✅ Done |
| PDF Report Export (jsPDF + autoTable) | ✅ Done |
| Cash Flow Projection (recurring-aware, 6-month) | ✅ Done |
| Public Landing Page | ✅ Done |
| Mobile Responsive Layout | ✅ Done |
| Categorization Rules Engine (CRUD, not auto-applied) | ⚠️ Partial |
| ML Forecasting (Prophet, ARIMA) | 📋 Planned |
| Sankey Diagrams (money flow) | 📋 Planned |
| PDF Report Export | 📋 Planned |
| Cash Flow Projection (recurring-aware) | 📋 Planned |
| Couples / Household Accounts | 📋 Planned |
| Credit Score Tracking | 📋 Planned |
| Recurring Calendar View | 📋 Planned |
| Flex Budgeting (fixed/non-monthly/flexible buckets) | 📋 Planned |
| Customizable Dashboard (drag-and-drop) | 📋 Planned |
| Tax Summary Report | 📋 Planned |
| Scheduled Reports (email) | 📋 Planned |
| Mobile Apps (React Native / Capacitor) | 📋 Planned |

---

## Tech Stack

```
┌────────────────────────────────────────────┐
│           React 19 + Vite 5                │
│      Tailwind CSS + shadcn/ui + Chart.js   │
│        TanStack Query + Groq / OpenAI       │
├────────────────────────────────────────────┤
│          Express + Prisma ORM              │
│              PostgreSQL                    │
├────────────────────────────────────────────┤
│      FastAPI + XLM-RoBERTa + sklearn       │
│   Tesseract OCR + Keyword Categorizer      │
├────────────────────────────────────────────┤
│  Plaid Sandbox + Multi-Currency (7)        │
│  German Bank PDF Parser                    │
└────────────────────────────────────────────┘
```

---

## Architecture

```
            React Frontend (Vite, PWA-ready)
                       │
                       ▼
              Vite Dev Proxy / Nginx
                       │
         ┌─────────────┴──────────────┐
         ▼                            ▼
  Express REST API             FastAPI ML Service
  (18 route files)            (categorization, OCR)
         │                            │
         ▼                            ▼
  PostgreSQL              XLM-RoBERTa + sklearn
  (16 Prisma models)      (86.5% accuracy)
         │
         ├── Clerk Auth (JWT verification)
         ├── Plaid Link (sandbox)
         ├── Auto-Categorize (100+ keywords)
         ├── Recurring Detection
         ├── Budget Alerts → Notifications
         └── AI Chat → Groq / OpenAI
```

---

## Project Structure

```
FinBrain/
├── apps/
│   ├── web/                  # React 19 + Vite frontend (17 pages, 17 components)
│   ├── api/                  # Express REST API (18 route files, 16 Prisma models)
│   └── ml-service/           # FastAPI Python ML service (XLM-RoBERTa + sklearn)
├── packages/
│   └── shared/               # Shared TypeScript types & interfaces
├── .github/workflows/        # CI/CD pipelines
├── docker-compose.yml        # Local development
├── docs/
│   ├── FEATURE_ROADMAP.md    # Gap analysis vs Industry Standard
│   └── SPRINTS.md            # Sprint plan
└── package.json              # Root workspace config
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (optional)
- PostgreSQL 16 (optional — Docker recommended)

### Local Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter @finbrain/api db:generate

# Start in dev mode (web + api)
pnpm dev

# Or start everything with Docker
docker compose up
```

### Environment Variables

Copy the example env files and fill in your keys:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

Required services:
- **Clerk** — Authentication ([clerk.com](https://clerk.com))
- **Plaid** — Bank data integration (sandbox mode) ([plaid.com](https://plaid.com))
- **PostgreSQL** — Database (local Docker or Cloud SQL)
- **Groq** — LLM AI assistant (free tier, no credit card) ([groq.com](https://groq.com))
- **OpenAI** *(optional)* — Fallback LLM if Groq is unavailable

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases |
| `dev` | Active development — all tested code |
| `feat/*` | Feature branches merged into `dev` |

Current feature branches: `feat/phase4-phase5-gaps`, `feat/quality-polish-phase1`, `feat/feature-parity-core`, and others.

---

## Development Roadmap

| Wave | Focus | Status |
|------|-------|--------|
| 1 | LLM AI Assistant, Investment Tracking, Budget Alerts | ✅ Complete |
| 2 | ML Forecasting, Sankey Diagrams, PDF Export, Cash Flow | ✅ Complete |
| 3 | Couples/Household, Credit Score, Flex Budgeting, Calendar View | 📋 Planned |
| 4 | Notification Center polish, Customizable Dashboard, Mobile Apps | 📋 Planned |

See [FEATURE_ROADMAP.md](./docs/FEATURE_ROADMAP.md) for the full gap analysis vs Industry Standard.

---

## License

[MIT](./LICENSE)
