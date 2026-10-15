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

<p align="center">
  <a href="https://kunj157.github.io/FinBrain/"><strong>Live site →</strong> kunj157.github.io/FinBrain</a>
</p>

<p align="center">
  <img src="docs/media/hero.gif" width="900" alt="The FinBrain landing hero: 3D coin stacks rising into a growth curve that leans toward the cursor"/>
</p>

---

## Screenshots

| Dashboard | Goals |
|---|---|
| <img src="docs/media/dashboard-dark.webp" alt="Dashboard with animated stat cards and a 3D spending mix ring"/> | <img src="docs/media/goals-dark.webp" alt="Goals with 3D progress rings"/> |
| **Analytics** | **Advisor** |
| <img src="docs/media/analytics-dark.webp" alt="Analytics with themed charts and segmented controls"/> | <img src="docs/media/advisor-dark.webp" alt="AI advisor chat"/> |
| **Transactions** | **Light theme** |
| <img src="docs/media/transactions-dark.webp" alt="Transactions ledger"/> | <img src="docs/media/dashboard-light.webp" alt="Dashboard in the light theme"/> |

A short recording of the 3D hero is also available as [MP4](docs/media/hero.mp4).

---

## Overview

FinBrain is a full-stack AI-powered personal finance tracker built as a monorepo. It combines ML-powered transaction categorization (XLM-RoBERTa, 86.5% accuracy), an LLM financial advisor (Groq/OpenAI), German bank PDF parsing, investment portfolio tracking, and a premium light and dark interface with motion and 3D into a single application.

### Core Philosophy

- **AI-first categorization** — XLM-RoBERTa transformer with 100+ keyword fallback, not rigid rule sets
- **Personal financial advisor** — LLM answers questions with reasoning based on your complete financial context
- **Data-first onboarding** — Import via Plaid, CSV, or German bank PDFs before anything else
- **Adaptive budgets** — Learn from your spending, alert at thresholds, rollover support

### Interface

- **Design system** — light and dark themes built from HSL tokens, with money semantics (positive, negative, warning, info), an AI accent and a chart palette checked for colour-vision deficiency in both themes
- **Motion** — animated and sliding numbers, a sliding active indicator in navigation and tabs, scroll reveals, spotlight and 3D tilt on cards, a shimmer and travelling border while the AI works; all of it respects `prefers-reduced-motion`
- **3D** — an interactive landing hero, goal progress rings and a dashboard spending-mix ring (three.js via React Three Fiber), loaded lazily only when WebGL is available, paused off screen, with static fallbacks
- **Performance** — every page is code-split; the entry bundle is about 150 kB gzip
- **Accessible** — labelled controls, visible focus rings, real switches and sortable headers announced to screen readers

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
| Public Landing Page ([live](https://kunj157.github.io/FinBrain/)) | ✅ Done |
| Mobile Responsive Layout | ✅ Done |
| Categorization Rules Engine (CRUD, auto-apply) | ✅ Done |
| Advisor Profile & Memory Layer | ✅ Done |
| Deterministic Affordability Engine | ✅ Done |
| Persistent Advisor Chat (multi-turn) | ✅ Done |
| AI Insights & Weekly Recap | ✅ Done |
| Couples / Household Accounts | ✅ Done |
| Credit Score Tracking | ✅ Done |
| Recurring Calendar View & Bill Reminders | ✅ Done |
| Flex Budgeting (fixed/non-monthly/flexible buckets) | ✅ Done |
| Tax Summary Report | ✅ Done |
| Data Quality Dashboard | ✅ Done |
| Scenario Simulator | ✅ Done |
| Spending Pattern Detection | ✅ Done |
| Anomaly Detection | ✅ Done |
| Customizable Dashboard (drag-and-drop) | ✅ Done |
| Interface redesign (tokens, motion, 3D) | ✅ Done |
| Scheduled Reports (email) | 📋 Planned |
| Mobile Apps (React Native / Capacitor) | 📋 Planned |

---

## Tech Stack

```
┌────────────────────────────────────────────┐
│           React 19 + Vite 5                │
│  Tailwind CSS + Radix UI + Chart.js + nivo │
│   Motion + three.js (React Three Fiber)    │
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
│   ├── web/                  # React 19 + Vite frontend (design system, motion, 3D)
│   ├── landing/              # Static marketing site published to GitHub Pages
│   ├── api/                  # Express REST API (18 route files, 16 Prisma models)
│   └── ml-service/           # FastAPI Python ML service (XLM-RoBERTa + sklearn)
├── packages/
│   └── shared/               # Shared TypeScript types & interfaces
├── .github/workflows/        # CI/CD pipelines
├── docker-compose.yml        # Local development
├── docs/
│   ├── media/                # Screenshots and the hero recording (README + landing)
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

# Generate the Prisma client and create the schema
pnpm --filter @finbrain/api db:generate
pnpm --filter @finbrain/api db:push

# Optional: seed a demo user with transactions
pnpm --filter @finbrain/api seed

# Start in dev mode (web on :5173, api on :4000)
pnpm dev

# Or start everything with Docker
docker compose up
```

Without a Clerk key the web app signs you in as a local development user, which is the quickest way to try it.

### Checks

```bash
pnpm lint && pnpm typecheck   # every workspace
pnpm test                     # API (Vitest + PostgreSQL) and web component tests
pnpm test:e2e                 # Playwright, starts the API and web app itself
pnpm build
```

### Landing page

```bash
pnpm --filter @finbrain/landing dev     # http://localhost:5190
PAGES_BASE_PATH=/FinBrain pnpm --filter @finbrain/landing build
```

The `landing` workflow publishes it to GitHub Pages on every push to `main` or `dev` that touches it.

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

## Running in Production

See [OPERATIONS.md](./docs/OPERATIONS.md) for health and readiness probes,
structured logging, required configuration, and the backup and restore
procedure (including how to verify a restore actually works).

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases |
| `dev` | Active development — all tested code |
| `feature/*` | Feature branches merged into `dev` |

---

## Development Roadmap

| Wave | Focus | Status |
|------|-------|--------|
| 1 | LLM AI Assistant, Investment Tracking, Budget Alerts | ✅ Complete |
| 2 | ML Forecasting, Sankey Diagrams, PDF Export, Cash Flow | ✅ Complete |
| 3 | Advisor Foundation: Finance Math, Data Quality, Profile Engine | 📋 Planned |
| 4 | Advisor: Affordability Engine, Persistent Chat, Insights | 📋 Planned |
| 5 | Flex Budgeting, Recurring Calendar, Household/Couples | 📋 Planned |
| 6 | Credit Score, Investment Intelligence, Forecasting v2 | 📋 Planned |
| 7 | Reports, UX Polish, Mobile PWA, Security, Billing | 📋 Planned |

See [FEATURE_ROADMAP.md](./docs/FEATURE_ROADMAP.md) for the full gap analysis vs Industry Standard.

---

## License

[MIT](./LICENSE)
