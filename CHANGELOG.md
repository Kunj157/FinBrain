# Changelog

All notable changes to FinBrain will be documented in this file.

## 0.8.0 — 2026-10-02

Production hardening. This is the first release to `main` since 0.5.0, so it also carries everything documented under 0.6.0 and 0.7.0.

### Breaking

- The API now refuses to start in production without `DATABASE_URL`, `CLERK_SECRET_KEY` and `ENCRYPTION_KEY`, and rejects `DEV_MODE=true` together with `NODE_ENV=production`. Generate the encryption key with `openssl rand -base64 32`; rotating it later makes existing linked banks unreadable and they must be reconnected.
- Plaid routes no longer accept or return an access token. Clients work from an `itemId`; any integration passing a token must be updated.

### Security

- **Authentication fails closed.** A missing `CLERK_SECRET_KEY` silently authenticated every caller as the development user, in production as readily as locally. Configuration is validated at boot instead.
- **Plaid access tokens stay on the server.** They were handed to the browser and posted back on every sync, granting ongoing read access to a real bank account. They are now encrypted at rest with AES-256-GCM and looked up server-side.

### Added

- **Readiness probe.** `/api/v1/ready` verifies the database and answers 503 when it cannot. `/api/v1/health` stays cheap and dependency-free for liveness, and the production container healthcheck now probes `/ready`.
- **Structured logging and request correlation.** Every request carries an id — accepted from `x-request-id` or generated — returned on the response and in the body of a 500, and logs one JSON line with method, path, status, duration and user id. `reportError` is a single sink for wiring up a vendor later.
- **Database backups.** A scheduled dump service with daily, weekly and monthly retention, writing to a host directory rather than a Docker volume. `scripts/restore-db.sh` restores; `scripts/verify-backup.sh` proves the round trip by restoring into a disposable PostgreSQL container and comparing row counts table by table.
- **`docs/OPERATIONS.md`** — probes, log format, required configuration, and the backup and restore procedure.
- Advisor: streaming replies over SSE, markdown rendering, persistent conversations, stored memories with confidence-rated data quality, scenario planning and net-worth projection.
- Bill reminders for upcoming and missed payments, budget alerts at 50% utilisation, portfolio top movers, and goal type options.

### Fixed

- **Exchange rates were hardcoded and never refreshed** — 83.5 INR to the dollar against an actual rate near 96 — with every response stamped as current. The table also stored each pair independently, so USD/EUR was 0.92 while EUR/USD was 1.09 and converting back did not return the original amount. Rates now come from the ECB reference set, are held as units per 1 USD so reciprocals agree by construction, and report the date they are actually for.
- **Totals summed mixed currencies**, on the client and then on the server. Conversion now happens at the query boundary. On the seeded account this overstated net cash flow by 54.7%; budget utilisation counted a 9,633 INR expense against a USD 500 budget at face value, and the advisor stated the wrong figure back as advice.
- **Money was stored as double precision**, so amounts drifted. Monetary columns are `numeric(19,4)`, with aggregate sums converted back to numbers rather than serialised as strings.
- **Statement import wrote nothing** while reporting success; the failure is now surfaced.
- Bank sync and import are idempotent, Plaid's sign convention is no longer inverted, and its currency is honoured rather than assumed to be USD.
- The dashboard presented cash flow as net worth, computed statistics from only the last 100 transactions, and coloured a drop in spending as a loss.
- Uploads are bounded by size and type, always cleaned up, and no longer admit an executable behind `application/octet-stream`.
- Async route failures hung the request; bad requests returned a status the caller could not act on.
- Rate limiting on the paid AI endpoints, with IPv6 addresses normalised so one address cannot evade the bucket.
- Advisor memory extraction duplicated a row per turn; profiles were built once and cached forever, pinning accounts at "Insufficient data".
- The service worker cached account data and pinned users to stale builds.
- Soft-deleted transactions kept counting against their budget.

### Changed

- Migrations are tracked and the drift against the schema is closed, so deploys run `prisma migrate deploy` against a known history.
- `package.json` version is back in step with the release tags; it had been left at 0.2.0.

## 0.7.0 — 2026-07-19

### Added
- **ML Forecasting** — Prophet, ARIMA, Linear Regression, and Moving Average models wired to actual prediction endpoints. `/api/v1/forecast` returns monthly income/expense/net forecasts with MAPE accuracy scores. Frontend forecasting page with model comparison table, 3/6/12-month projections, and bar visualizations.
- **Sankey Diagrams** — Money flow visualization on the Reports page showing Income → Expense categories using @nivo/sankey. Color-coded links proportional to spending amounts.
- **PDF Report Export** — Client-side PDF generation via jsPDF + jspdf-autotable. Reports include summary stats, category breakdown table, top merchants, and full transaction list with professional formatting.
- **Cash Flow Projection** — Recurring-aware projections on the Analytics page. Separates fixed recurring expenses from variable spending. Shows 30/60/90-day balance projections plus 6-month bar visualization.

### Changed
- ML service forecasting models updated from "development" to "ready" status
- Analytics cash flow section renamed from "Cash Flow Forecast" to "Cash Flow Projection" with recurring/variable expense breakdown

## 0.6.0 — 2026-07-19

### Added
- **AI Assistant** — LLM-powered financial advisor via Groq (llama-3.1-8b-instant) with OpenAI fallback. Full financial context injection (income, expenses, savings rate, budgets, goals, accounts, recurring). "Can I afford X?" decision support with reasoning.
- **Investment Portfolio Tracking** — Portfolio and holding CRUD. Allocation breakdown, gain/loss calculation, cross-portfolio summary by asset type.
- **Budget Alerts** — Threshold notifications at 75%, 90%, 100% of budget. Deduped within 24h. In-app notification bell with dropdown, mark all read, auto-refresh.
- **Re-categorization Tooling** — Bulk re-run keyword classification on all transactions via `POST /seed/re-categorize`.

### Fixed
- **Auto-categorize rewrite** — Keywords always win (confidence 1.0), ML only as fallback. Removed payment type words (Lastschrift, Überweisung, Abbuchung) from Bills & Utilities. Word-boundary regex for single-word keywords. Merchant-name matches boosted over description.
- **Negative expense bug** — Expenses stored as negative amounts caused wrong calculations across 7 frontend files (insights, dashboard, analytics, charts, reports, AI). Fixed with `Math.abs()` wrappers.
- **PDF import limit** — Removed `.slice(0, 10)` from parse endpoints that was only returning first 10 transactions.
- **Category resolution** — DB category IDs are UUIDs, not hardcoded strings. Fixed UUID lookup in import and transaction routes.

## 0.5.0 — 2026-07-11

### Added
- Savings Goals page with full CRUD, contributions, progress bars, on-track detection (10 icons, 9 goal types)
- Analytics page with monthly income/expenses bar, cumulative trend line, day-of-week spending, category breakdown, top 10 merchants, time period filter
- Reports page with monthly/quarterly/annual report types, period navigation, category breakdown, top merchants, CSV export, print-to-PDF
- AI Insights page with financial health score (SVG gauge), auto-generated smart insight cards (alerts, suggestions, observations), and Ask FinBrain chat Q&A
- Help & Support page with FAQ accordion, quick start guide, keyboard shortcuts reference

### Fixed
- Plaid link no longer hardcodes invalid `categoryId` '10' — now fetches categories and uses 'Other' as default
- Bulk transaction import validates `categoryId` against existing DB categories before insert, falls back to 'Other' for invalid IDs
- Server no longer crashes on unhandled promise rejections — added global Express error handler + process-level `unhandledRejection` handler
- Select dropdown option text unreadable in dark mode — added explicit `select option` styling

## 0.4.0 — 2026-07-11

### Added
- Database persistence via Prisma/PostgreSQL — all data now survives restarts
- Auto-seeded default categories on server startup
- Seed data generator endpoint (`POST /seed/transactions`) for realistic demo data
- Budgets management page with CRUD, progress bars, and utilization tracking
- Card hover effects with scale and shadow transitions
- Category icons mapped to Lucide icon components
- Sticky table headers with backdrop blur on transactions page
- Smart pagination with ellipsis on transactions page
- Escape key closes transaction modal
- Confirmation dialog before clearing all data in Settings

### Fixed
- Critical bug: `gradient-border::before` pseudo-element intercepted all clicks inside Card components (missing `pointer-events-none`)
- Dashboard: real month-over-month percentage changes instead of fake random numbers
- Dashboard: chart overflow now scrolls instead of clipping
- Budgets: action buttons hidden by default, revealed on hover
- Categories: color swatches scale on hover
- Sidebar: "Ask FinBrain" card now navigates to `/insights`
- CI: added `prisma generate` to typecheck and build scripts

## 0.3.0 — 2026-07-10

### Added
- Full transactions management page with search, filter, sort, pagination, bulk select/delete, and modal create/edit form
- Categories management page with add/edit/delete, color picker, and icon selector
- Dashboard charts (Income vs Expenses bar, Spending by Category donut, 30-day Spending Trend line)
- Backend CRUD API routes for transactions and categories
- PDF bank statement parser for German Sparkasse format (DD.MM.YYYY, comma decimals)
- Unified `/import/parse` endpoint that auto-detects CSV vs PDF
- Sidebar navigation link for Categories page and Onboarding page

### Fixed
- PDF import: amount sign no longer stripped (all transactions showed as income)
- PDF import: `www.` regex no longer matches uppercase merchant names (WWW.)
- PDF import: date regex boundary now matches German transaction descriptions
- PDF import: case-insensitive `.pdf` extension check
- CORS "Network Error" when accessing app from network IP — removed `VITE_API_URL` from `.env` so Vite proxy is used instead of direct API calls
- File uploads failing with "No file uploaded" — removed axios default `Content-Type: application/json` header that broke FormData multipart uploads

## 0.2.0 — 2026-07-10

### Added
- Plaid bank integration (link token, exchange, sync, accounts)
- CSV import with drag-and-drop UI and column mapping
- Onboarding flow with four data import options (Plaid, CSV, DevBank, Sample Data)
- Local transaction store for demo without backend
- Multi-currency support with exchange rate API and currency selector in Settings
- Auto-categorization service that maps merchants to categories
- CSV duplicate detection with Levenshtein-based fuzzy matching
- Receipt OCR via ML service (Tesseract) with extract, preview, and save flow
- DevBank SDK integration for local mock bank data import
- Dedicated Settings page with Display Preferences and Data management

### Fixed
- User display name corrected to "Kunj Patel"
- Dark/light mode toggle now works and persists preference

## 0.1.0 — 2026-07-09

### Added
- pnpm monorepo with apps/web, apps/api, apps/ml-service
- React 19 + Vite + Tailwind with emerald dark theme
- shadcn/ui component primitives (Button, Card, Badge, Avatar)
- Glass-morphism sidebar navigation with 12 routes
- Dashboard page with stat cards, quick actions, AI insights
- Sign In / Sign Up auth pages
- Express + Prisma backend with PostgreSQL schema (15 models)
- FastAPI ML service scaffold
- Docker Compose for local development
- GitHub Actions CI pipeline
- PWA manifest
