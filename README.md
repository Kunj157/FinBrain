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

FinBrain helps users manage their finances while leveraging AI to forecast future expenses, detect anomalies, recommend budgets, and simulate financial scenarios. Every user gets a personalized experience — FinBrain learns your spending patterns and adapts its recommendations to you.

### Core Philosophy

- **No rigid budgets** — FinBrain learns your pattern and adapts
- **Personal advisor** — AI answers questions with reasoning based on your actual data
- **Data-first onboarding** — Import your bank data (Plaid, CSV) or upload receipts before anything else
- **Offline-capable** — PWA with local sync for on-the-go expense tracking

### Key Features

| Feature | Status |
|---------|--------|
| Secure Authentication (Clerk) | ✅ Phase 1 |
| Dashboard & Summary Cards | ✅ Phase 1 |
| Bank Integration (Plaid Sandbox) | ✅ Phase 2 |
| CSV/QFX/OFX Data Import | ✅ Phase 2 |
| Receipt OCR | ✅ Phase 2 |
| Multi-Currency Support | ✅ Phase 2 |
| Transaction CRUD & Search | ✅ Phase 3 |
| Adaptive Budget Engine | 📋 Phase 4 |
| Financial Goals | 📋 Phase 4 |
| Analytics & Reports | 📋 Phase 5 |
| Cloud-Native Deployment | 📋 Phase 6 |
| PWA Offline Support | 📋 Phase 6 |
| ML Forecasting (Prophet, ARIMA) | 📋 Phase 7 |
| AI Assistant (Chat) | 📋 Phase 7 |
| What-If Simulator | 📋 Phase 7 |
| Quality & Accessibility Polish | ✅ In Progress |

---

## Tech Stack

```
┌────────────────────────────────────────────┐
│              React 19 + Vite                │
│         Tailwind CSS + shadcn/ui            │
│         TanStack Query + Chart.js           │
├────────────────────────────────────────────┤
│           Express + Prisma ORM              │
│            PostgreSQL + Redis               │
├────────────────────────────────────────────┤
│        FastAPI + scikit-learn + Prophet     │
│         OCR + Anomaly Detection             │
├────────────────────────────────────────────┤
│            Docker Compose                   │
│         Google Cloud Run + GCS              │
│         Pub/Sub + Secret Manager            │
└────────────────────────────────────────────┘
```

---

## Architecture

```
                React Frontend (PWA)
                      │
                      ▼
              Cloud Load Balancer
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
 Express REST API             FastAPI ML Service
        │                            │
        ├──────────────┐             │
        ▼              ▼             ▼
 PostgreSQL         Redis Cache   ML Models
        │              │
        └──────────────┴──────────────┐
                                      ▼
                               Google Pub/Sub
                                      │
                                      ▼
                              Background Workers
                                      │
                                      ▼
                       Reports • OCR • Forecasts • Emails
```

---

## Project Structure

```
FinBrain/
├── apps/
│   ├── web/              # React 19 + Vite frontend
│   ├── api/              # Express REST API
│   └── ml-service/       # FastAPI Python ML service
├── packages/
│   ├── shared/           # Shared TypeScript types & interfaces
│   ├── ui/               # Shared UI components
│   └── config/           # ESLint, TypeScript, Prettier configs
├── infrastructure/       # Docker, Terraform (optional)
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml    # Local development
├── docs/                 # Documentation
└── package.json          # Root workspace config
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
- **Redis** — Caching (local Docker or Memorystore)

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases only. Empty until first release. |
| `dev` | Active development. All latest tested code lives here. |

All feature branches are created from and merged into `dev`.

---

## Development Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Foundation: Monorepo, Auth, Docker, CI/CD, UI Shell | ✅ Complete |
| 2 | Data Ingestion: Plaid, CSV, OCR, Multi-Currency | ✅ Complete |
| 3 | Finance Core: Transactions, Categories, Dashboard | ✅ Complete |
| 4 | Adaptive Budgeting & Goals | 📋 Planned |
| 5 | Analytics & Reports | 📋 Planned |
| 6 | Cloud-Native & Offline | 📋 Planned |
| 7 | ML, AI Assistant & What-If Simulator | 📋 Planned |
| Q | Quality & Accessibility Polish (toasts, skeletons, ARIA, focus traps, validation) | 🔄 In Progress |

See [PHASES.md](./docs/PHASES.md) for the complete detailed plan.

---

## License

MIT
