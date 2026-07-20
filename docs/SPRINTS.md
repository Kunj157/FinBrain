# FinBrain — Detailed Phase Plan

> **Branch**: `dev` (all phases merge here until release)
> **Releases**: Merge `dev` → `main` only at stable milestones

---

## Sprint 1 — Foundation ✅ (Complete)
> **Auth**: Clerk JWT verification enforced on all API routes. Frontend uses Clerk components for sign-in/sign-up. 401 responses auto-redirect to login. Dev fallback only when Clerk is unconfigured.
> **Onboarding**: No forced profile/onboarding wizard. Dashboard is the entry point with standard empty-state cards (Connect Bank, Import CSV, Sample Data, DevBank). Sidebar Onboarding → Import.

**Goal**: Secure application with working infrastructure and UI shell.

### Monorepo Setup
- [x] pnpm workspace (`apps/web`, `apps/api`, `apps/ml-service`)
- [x] Shared packages (`packages/shared`, `packages/ui`, `packages/config`)
- [x] TypeScript project references with shared tsconfigs
- [x] ESLint + Prettier configuration per app
- [x] `.gitignore`, `.npmrc`, `pnpm-workspace.yaml`

### Frontend (apps/web)
- [x] Vite + React 19 scaffolded
- [x] Tailwind CSS v3 with custom dark theme
- [x] shadcn/ui component primitives (Button, Card, Badge, Avatar)
- [x] Custom CSS utilities (`glass`, `gradient-border`, `glow`, `card-hover`)
- [x] Dark-emerald color palette with CSS variables
- [x] Glass-morphism sidebar navigation (12 routes)
- [x] Header with search bar, notifications, user avatar
- [x] Dashboard page with stat cards, quick actions, AI insights panel
- [x] Sign In / Sign Up auth pages with glass design
- [x] Protected route wrapper
- [x] Auth context provider (Clerk-ready)
- [x] API client with Axios
- [x] TanStack Query client setup
- [x] PWA manifest and favicon

### Backend (apps/api)
- [x] Express server with CORS, Helmet, Morgan
- [x] Prisma ORM with PostgreSQL schema (15 models)
- [x] Health check endpoint
- [x] Clerk JWT verification middleware
- [x] API route structure under `api/v1`
- [x] Environment-based configuration

### ML Service (apps/ml-service)
- [x] FastAPI server scaffolded
- [x] Health check and models listing endpoints
- [x] Dockerfile with Tesseract OCR
- [x] Python dependencies (pandas, numpy, scikit-learn, Prophet, statsmodels)

### Infrastructure
- [x] Docker Compose (Postgres, Redis, API, ML, Web, DevBank)
- [x] Production Dockerfiles for API and Web
- [x] Nginx config for SPA + API proxy
- [x] GitHub Actions CI (lint → typecheck → test → build → Docker push)

### Database Schema
- [x] Users, Transactions, Categories, Budgets, BudgetHistory
- [x] Goals, GoalContributions, Forecasts, Recommendations
- [x] FinancialHealth, Receipts, Notifications, AuditLogs

### Product Decisions Made
- Web-first with PWA capabilities (installable, offline)
- Dark theme with emerald accent as brand identity
- Adaptive budgets (no template — learn user patterns)
- Multi-currency support from day one
- Data import as first onboarding step
- Plaid Sandbox + DevBank SDK for test bank data

---

## Sprint 2 — Data Ingestion ✅ (Complete)

**Goal**: Users can get their financial data into FinBrain via any method.

### Plaid Integration
- [x] Plaid Link frontend component (sandbox mode)
- [x] Plaid API backend routes (`/api/v1/plaid/link-token`, `/api/v1/plaid/exchange-token`)
- [x] Plaid Transactions sync (`/api/v1/plaid/sync`)
- [x] Sandbox test accounts (`user_good` / `pass_good`)
- [x] Map Plaid categories to FinBrain categories
- [x] Handle duplicate detection during sync

### DevBank SDK Integration
- [x] DevBank client service in Docker Compose (already configured)
- [x] Synthetic data generation (salary, bills, purchases, fraud scenarios)
- [x] Connect DevBank as a mock institution in the UI
- [x] One-click "Generate 3 months of sample data"

### CSV Import
- [x] CSV upload UI (drag-and-drop or file picker)
- [x] CSV parsing backend (configurable column mapping)
- [x] Support for common formats (Chase, Bank of America, Mint, YNAB, generic)
- [x] Preview imported data before saving
- [x] Duplicate detection with fuzzy matching
- [x] Categorization suggestions based on merchant name

### Multi-Currency
- [x] Currency selector on user profile
- [x] Exchange rate service (hardcoded rates for testing)
- [x] Store `amount` + `currency` on every transaction
- [x] Display amounts in user's preferred currency
- [x] Conversion via `/api/v1/currency/convert` endpoint

### Receipt OCR
- [x] Receipt upload UI with drag-and-drop
- [x] ML service OCR endpoint (`/api/v1/receipts/ocr`)
- [x] Tesseract-based text extraction
- [x] Merchant, amount, date extraction with regex
- [x] Suggested category based on merchant (via auto-categorize service)
- [x] Review before saving to transaction

### Onboarding Flow
- [x] First-run wizard with 4 options:
  - Connect your bank (Plaid)
  - Import a CSV/OFX file
  - Start fresh with DevBank
  - Generate sample data (local)
- [x] Progress indicator for data import status
- [x] Skip option (go to empty dashboard)

---

## Sprint 3 — Finance Core ✅ (Complete)

**Goal**: Functional expense tracker with CRUD operations.

### Transactions
- [x] Full CRUD for income transactions
- [x] Full CRUD for expense transactions
- [x] Transaction form with category selector, payment method, date picker
- [ ] Recurring transaction detection *(P3 — heuristic-based, no rules)*
- [ ] Transaction detail view/modal *(P3 — nice-to-have)*
- [x] Soft delete with audit log *(P2 — `deletedAt`, restore endpoint, audit trail)*

### Transaction List
- [x] Paginated transaction list with infinite scroll
- [x] Search by merchant, description, amount
- [x] Filter by type, category, date range, payment method, status
- [x] Sort by date, amount, merchant
- [x] Bulk actions (delete, categorize, flag)
- [ ] Export selected transactions to CSV *(P3 — CSV done elsewhere)*

### Categories
- [x] Default category set (Food, Transport, Shopping, Bills, etc.)
- [x] Category CRUD (custom categories)
- [ ] Category hierarchy (parent/child) *(P3 — schema ready, no UI)*
- [x] Color picker per category
- [x] DistilBERT model fine-tuned on 68k transactions
- [x] Model integrated into ml-service classifier (sklearn → transformer fallback)
- [x] Auto-categorization rules (merchant → category)

### Dashboard Enhancement
- [x] Income vs Expenses chart (monthly bar chart)
- [x] Category breakdown (doughnut/pie chart)
- [x] Spending trend (7-day, 30-day)
- [x] Recent transactions list (live)
- [x] Cash flow summary
- [x] Quick-add transaction button

---

## Sprint 4 — Adaptive Budgeting & Goals 📋

**Goal**: Budgets that learn the user, not the other way around.

### Adaptive Budget Engine
- [ ] Pattern analysis after 30+ days of transaction data
- [ ] Identify income cadence (weekly, bi-weekly, monthly, irregular)
- [ ] Average category spending per month
- [ ] Suggest category budgets based on actual averages (not templates)
- [ ] Auto-adjust budgets up/down as patterns change
- [ ] User can override any suggested budget
- [ ] Budget vs actual visualization

### Budget Management
- [ ] Create manual monthly budgets per category
- [ ] View all budgets with progress bars
- [ ] Budget utilization summary card
- [ ] Remaining budget per category
- [ ] Rollover rules (unused budget rolls to next month)
- [ ] Budget history view (previous months)
- [ ] Budget alerts ("You've used 80% of dining budget")

### Financial Goals
- [ ] Goal creation (name, target amount, deadline, icon, category)
- [ ] Goal types: Emergency Fund, Vacation, Car, House, Laptop, Custom
- [ ] Progress tracking (current amount, percentage, remaining)
- [ ] Auto-contribution from income or monthly savings
- [ ] Estimated completion date calculation
- [ ] Goal contribution history
- [ ] Goal progress chart
- [ ] "What if I increase my monthly contribution?" projection

### Alerts & Notifications
- [ ] Budget threshold alerts (50%, 75%, 90%, 100%)
- [ ] Goal milestone alerts
- [ ] Unusual spending alerts
- [ ] Notification center (in-app)
- [ ] Email notification preferences

---

## Sprint 5 — Analytics & Reports 📋

**Goal**: Rich analytics platform with exportable reports.

### Advanced Dashboard
- [ ] Income vs Expenses (stacked bar, 12-month view)
- [ ] Savings trend (line chart with projections)
- [ ] Budget utilization (radial gauges per category)
- [ ] Cash flow forecast (projected balance 30/60/90 days)
- [ ] Year-over-Year comparison
- [ ] Financial heatmap (spending intensity by day/month)
- [ ] Net worth tracker (assets - liabilities)
- [ ] Custom date range selector for all charts
- [ ] Responsive chart grid with drag-to-reorder
- [ ] Dark mode support for all chart elements
- [ ] Tooltips with precise values on hover

### Financial Health Score
- [ ] Score calculation engine (0-100)
  - Savings Rate (20% weight)
  - Expense Ratio (15% weight)
  - Budget Adherence (20% weight)
  - Emergency Fund (20% weight)
  - Debt Ratio (15% weight)
  - Spending Consistency (10% weight)
- [ ] Score breakdown with explanations
- [ ] Historical score trend chart
- [ ] Suggested improvements based on weak areas
- [ ] Score gauge visualization

### Reports Engine
- [ ] Monthly financial report (PDF)
- [ ] Quarterly summary (PDF)
- [ ] Annual report (PDF)
- [ ] Category spending summary (PDF/CSV)
- [ ] Tax summary report (filter by category, date)
- [ ] Export all transactions (CSV/Excel)
- [ ] Report preview before download
- [ ] Scheduled report generation (email delivery)
- [ ] Report templates with branding

### Analytics Filters
- [ ] Date range picker (presets + custom)
- [ ] Category filter (include/exclude)
- [ ] Transaction type filter
- [ ] Payment method filter
- [ ] Compare periods (this month vs last month, YoY)

---

## Sprint 6 — Cloud-Native & Offline 📋

**Goal**: Production-ready cloud architecture with offline-first PWA.

### Google Cloud Deployment
- [ ] Cloud Run service for API (auto-scaling, min 0)
- [ ] Cloud Run service for ML (auto-scaling, min 0)
- [ ] Cloud SQL PostgreSQL instance
- [ ] Cloud Storage bucket (receipts, reports, avatars)
- [ ] Secret Manager (DB creds, Clerk keys, Plaid keys, Sentry DSN)
- [ ] VPC connector for private networking
- [ ] Cloud Load Balancer with SSL
- [ ] Custom domain with Cloud DNS

### Redis Caching
- [ ] Cache dashboard statistics (5 min TTL)
- [ ] Cache forecast data (1 hour TTL)
- [ ] Cache frequently accessed reports (1 hour TTL)
- [ ] Cache Plaid transactions sync status
- [ ] Cache invalidation on data mutation
- [ ] Rate limiting with Redis

### Event-Driven Architecture (Pub/Sub)
- [ ] Topics: `expense.created`, `budget.updated`, `goal.achieved`, `receipt.uploaded`, `forecast.ready`
- [ ] Publisher service in API
- [ ] Subscriber service in background workers
- [ ] Event logging with Cloud Logging

### Background Workers
- [ ] OCR processing worker (process receipt images)
- [ ] Forecast generation worker (run ML models)
- [ ] Report generation worker (build PDFs/CSVs)
- [ ] Email notification worker
- [ ] Monthly summary worker
- [ ] Health score recalculation worker
- [ ] Job queue with Pub/Sub pull subscriptions

### Scheduled Jobs (Cloud Scheduler)
- [ ] Daily: Update forecasts for all active users
- [ ] Weekly: Generate budget summary, send email
- [ ] Monthly: Generate financial report, recalculate health scores
- [ ] Nightly: Health score recalculation, data cleanup

### PWA & Offline
- [ ] Service worker registration
- [ ] IndexedDB local storage for transactions
- [ ] Offline transaction creation (save to local, sync when online)
- [ ] Background sync API for pending changes
- [ ] Offline dashboard (cached summary)
- [ ] Add to homescreen prompt
- [ ] Push notifications
- [ ] Cache-first strategy for static assets

### Monitoring
- [ ] Google Cloud Monitoring dashboards
  - API request latency
  - ML service inference time
  - Database connection pool
  - Error rates
- [ ] Google Cloud Logging with structured logs
- [ ] Sentry error tracking (frontend + backend)
- [ ] Custom metrics (forecast accuracy, score changes)
- [ ] Uptime checks with Cloud Monitoring
- [ ] Alert policies (error rate > 1%, latency > 500ms)

---

## Sprint 7 — ML & AI Assistant 📋

**Goal**: AI-powered financial forecasting and natural language assistant.

### Forecasting Models
**Moving Average (Baseline)**
- [ ] 3-month, 6-month, 12-month simple moving average
- [ ] Next month, 3 months, 6 months predictions
- [ ] Basic confidence interval (± std dev)

**Linear Regression**
- [ ] Trend-based spending forecast
- [ ] Savings rate projection
- [ ] Slope analysis (increasing/decreasing spending)
- [ ] R² goodness-of-fit display

**ARIMA**
- [ ] Auto ARIMA parameter selection
- [ ] Seasonal decomposition
- [ ] Time-series stationarity tests
- [ ] Residual analysis
- [ ] AIC/BIC model comparison

**Prophet**
- [ ] Daily/weekly/monthly seasonality detection
- [ ] Holiday effects
- [ ] Changepoint detection
- [ ] Uncertainty intervals
- [ ] Forecast components (trend, weekly, yearly)
- [ ] Multiplicative/additive seasonality

**Model Comparison**
- [ ] Cross-model accuracy comparison table
- [ ] Best model auto-selection per user/category
- [ ] Historical forecast vs actual overlay chart
- [ ] MAPE (Mean Absolute Percentage Error) tracking
- [ ] Model retraining schedule

### Anomaly Detection
- [ ] Statistical outlier detection (Z-score, IQR)
- [ ] Unusual transaction amount (vs user's normal range)
- [ ] Duplicate expense detection (same merchant + amount + close date)
- [ ] Spending spikes (day/week compared to normal pattern)
- [ ] Abnormal category behavior (sudden new category spending)
- [ ] Anomaly highlighting in dashboard (red badge, explanation)
- [ ] User can dismiss or confirm anomalies (feedback loop)

### Recommendation Engine
**Rule-based (initial)**
- [ ] "You spent X% more on restaurants this month"
- [ ] "You may exceed your shopping budget in N days"
- [ ] "Reducing entertainment by $X/month lets you reach goal N months earlier"
- [ ] "Your emergency fund covers X months of expenses"
- [ ] "Consider increasing savings rate by X%"

**ML-powered (future)**
- [ ] Personalized savings suggestions
- [ ] Category reduction recommendations based on elasticity
- [ ] Optimal budget allocation
- [ ] Subscription detection and recommendation to cancel unused

### What-If Simulator
- [ ] Modify salary (income change)
- [ ] Adjust savings rate
- [ ] Increase/decrease category budgets
- [ ] Add one-time expense (e.g., "buy a MacBook in December")
- [ ] Simulate results:
  - Projected balance over time
  - Updated forecasts
  - Goal completion date changes
  - Health score impact
- [ ] Side-by-side comparison (current vs simulated)
- [ ] Share simulation as PDF

### AI Assistant (Chat)
- [ ] Chat UI (sidebar or full-page)
- [ ] Natural language query parser
- [ ] Query types:
  - **Spending**: "Where did I spend the most this year?"
  - **Affordability**: "Can I afford a MacBook in December?"
  - **Recommendations**: "What category should I reduce?"
  - **Trends**: "How much do I spend on coffee annually?"
  - **Forecast**: "What will my balance be in 3 months?"
  - **Goals**: "When will I reach my vacation goal?"
- [ ] Response format: answer + reasoning with data
- [ ] Context-aware (remembers previous questions in session)
- [ ] Suggested questions chip list
- [ ] Fallback to generic advice when data insufficient
- [ ] Rate limiting and token management

---

## Sprint 8+ — Stretch Goals 🚀

- [ ] React Native mobile app (shares API)
- [ ] Plaid Production for real bank connections
- [ ] Multi-user / household accounts
- [ ] Investment tracking (stocks, crypto, retirement accounts)
- [ ] Bill pay reminders
- [ ] Subscription management
- [ ] Tax deduction categorization
- [ ] Credit score monitoring
- [ ] Bank-grade encryption (end-to-end)
- [ ] i18n (multiple languages)
- [ ] Dark/light theme toggle per user
- [ ] Custom dashboard widgets
- [ ] Public API for third-party integrations
- [ ] Webhook system for external services

---

## Release Checklist

When merging `dev` → `main` for a release:

- [ ] All tests pass
- [ ] TypeScript typecheck passes
- [ ] Lint passes (0 errors, 0 warnings)
- [ ] Build succeeds for all apps
- [ ] Docker images build and run
- [ ] API contract is stable (no breaking changes without version bump)
- [ ] Database migrations are backward-compatible
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Tagged with version number
- [ ] Deployed to staging and verified
- [ ] Deployed to production

---

## Current State Addendum (July 2026)

The original sprint plan above is partially superseded by the completed Waves 1-2 and the new Monarch-Quality Implementation Plan.

### What's Done (supersedes earlier sprints)

- Sprint 1 (Foundation): ✅ Complete
- Sprint 2 (Data Ingestion): ✅ Complete
- Sprint 3 (Finance Core): ✅ Complete
- Wave 1 (LLM AI Assistant, Investment Holdings, Budget Alerts): ✅ Complete
- Wave 2 (ML Forecasting, Sankey Diagrams, PDF Export, Cash Flow Projection): ✅ Complete

### What's Next

The detailed implementation plan lives in `docs/MONARCH_ADVISOR_IMPLEMENTATION_PLAN.md`. It covers 18 phases from data integrity through production readiness. The current active work is **Milestone A — Advisor Foundation** (Phases 0-4):

- Phase 0: Documentation cleanup
- Phase 1: Finance math helpers + data quality
- Phase 2: Advisor profile, patterns, memory
- Phase 3: Affordability engine + scenarios
- Phase 4: Persistent advisor chat
