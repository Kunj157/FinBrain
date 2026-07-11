# Changelog

All notable changes to FinBrain will be documented in this file.

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
