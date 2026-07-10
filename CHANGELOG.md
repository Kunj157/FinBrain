# Changelog

All notable changes to FinBrain will be documented in this file.

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
