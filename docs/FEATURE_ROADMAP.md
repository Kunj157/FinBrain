# FinBrain vs Industry Standard — Feature Gap Analysis & Roadmap

> **Purpose**: Match Industry Standard's quality, then surpass it with a deeply personal AI financial assistant.
> **Date**: July 2026
> **Industry Standard Pricing**: Core $14.99/mo ($99.99/yr) | Plus $199/yr

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature-by-Feature Comparison](#feature-by-feature-comparison)
3. [Detailed Gap Analysis](#detailed-gap-analysis)
4. [Industry Standard's Full Feature Set (Reference)](#industry standard-moneys-full-feature-set)
5. [FinBrain's Current State](#finbrains-current-state)
6. [The Personal AI Financial Assistant — Our Differentiator](#the-personal-ai-financial-assistant)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Priority Matrix](#priority-matrix)

---

## Executive Summary

Industry Standard is the gold standard for personal finance apps in 2026, with 1M+ users, $75M in funding, and a feature set that covers budgeting, net worth, investments, forecasting, couples collaboration, and AI assistance. FinBrain has strong foundations (ML-powered categorization, full transaction CRUD, budgets, goals, accounts, Plaid integration) but is missing **14 major feature categories** that Industry Standard offers.

### The Gap at a Glance

| Category | Industry Standard | FinBrain | Gap |
|---|---|---|---|
| **Budgeting** | Flex + Category, rollover, alerts | Category budgets, rollover | Medium |
| **Net Worth** | Real-time + Zillow + historical trends | Basic net worth + history | Medium |
| **Investment Tracking** | Full portfolio, stocks, crypto, allocation | Account type only, no holdings UI | **Critical** |
| **Couples/Household** | Multi-user, shared views, yours/mine/ours | Single-user only | **Critical** |
| **Forecasting** | Plus tier: retirement, home, career break modeling | Linear extrapolation only | **Critical** |
| **AI Assistant** | CFP-trained, natural language, data-aware | Keyword-matching rule engine | **Critical** |
| **Reports** | Sankey diagrams, custom reports, PDF | Basic CSV + browser print | High |
| **Credit Score** | Built-in tracking | None | High |
| **Recurring/Subscriptions** | Calendar view, auto-detect, reminders | Detection only, no calendar | Medium |
| **Goals** | Rebuilt v3, progress, projections | Basic goals with contributions | Low-Medium |
| **Cash Flow** | Projection months ahead, recurring-aware | 30/60/90-day linear only | High |
| **Mobile** | iOS + Android, full feature parity | Web-only (PWA) | High |
| **Notifications** | In-app, customizable | Model exists, no UI | Medium |
| **Onboarding** | Polished wizard | Industry Standard-style wizard (done) | **Complete** |

---

## Feature-by-Feature Comparison

### 1. Budgeting

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Category-based budgets | ✅ | ✅ | **Match** |
| Flex budgeting (fixed/non-monthly/flexible buckets) | ✅ | ❌ | Gap |
| Rollover budgets | ✅ | ✅ | **Match** |
| Budget vs actual visualization | ✅ Progress bars | ✅ Progress bars | **Match** |
| Budget alerts (50%, 75%, 90%, 100%) | ✅ | ❌ | Gap |
| Budget history view | ✅ | ✅ | **Match** |
| Remaining budget per category | ✅ | ✅ | **Match** |
| Switch between budget styles | ✅ (flex ↔ category) | ❌ | Gap |
| Auto-suggest budgets from spending | ✅ (after 30+ days) | ❌ | Gap |

**Verdict**: Core budgeting is solid. Need: flex budgeting, alerts, auto-suggestions.

---

### 2. Net Worth Tracking

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Real-time net worth calculation | ✅ | ✅ | **Match** |
| Historical net worth trends | ✅ (weekly/monthly/yearly) | ✅ (monthly) | **Match** |
| Zillow/home value integration | ✅ | ❌ | Gap |
| Manual asset entry (car, property) | ✅ | ✅ (via account creation) | **Match** |
| Net worth dashboard widget | ✅ | ✅ | **Match** |
| Net worth over time chart | ✅ | ✅ (basic line chart) | Close |

**Verdict**: Mostly matched. Need: Zillow integration, richer historical granularity.

---

### 3. Investment Tracking

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Investment account connection | ✅ (Plaid sync) | ✅ (account type exists) | Partial |
| Portfolio holdings view | ✅ (stocks, bonds, ETFs, mutual funds) | ❌ | **Critical** |
| Real-time stock/ETF prices | ✅ | ❌ | **Critical** |
| Asset allocation breakdown | ✅ (pie chart) | ❌ | **Critical** |
| Crypto tracking (Coinbase) | ✅ | ❌ | Gap |
| Investment performance over time | ✅ | ❌ | **Critical** |
| Unrealized gains/losses | ✅ (Plus tier) | ❌ | Gap |
| Top movers | ✅ | ❌ | Gap |
| 401k/IRA tracking | ✅ | ❌ | Gap |

**Verdict**: This is the biggest gap. We have account types but zero investment intelligence.

---

### 4. Couples & Household

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Multi-user accounts | ✅ (separate logins) | ❌ | **Critical** |
| Shared budget view | ✅ | ❌ | **Critical** |
| Yours/Mine/Ours labels | ✅ | ❌ | Gap |
| Shared goals | ✅ | ❌ | Gap |
| Transaction comments/notes between partners | ✅ | ❌ | Gap |
| Role assignment (who pays what) | ✅ | ❌ | Gap |
| Financial advisor access | ✅ | ❌ | Gap |
| Free partner access (no extra cost) | ✅ | ❌ | **Critical** |

**Verdict**: Industry Standard's biggest differentiator. We're single-user only. This is a major rebuild.

---

### 5. Forecasting & What-If

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Cash flow projection (months ahead) | ✅ (Core: few months, Plus: years) | ⚠️ Basic 30/60/90-day linear | Gap |
| Net worth projection | ✅ (Plus) | ❌ | Gap |
| Retirement modeling | ✅ (Plus) | ❌ | Gap |
| Home purchase scenario | ✅ (Plus) | ❌ | Gap |
| Career break modeling | ✅ (Plus) | ❌ | Gap |
| Life event simulation | ✅ (Plus) | ❌ | Gap |
| Inflation/growth rate assumptions | ✅ (Plus) | ❌ | Gap |
| Scenario comparison (side-by-side) | ✅ (Plus) | ❌ | Gap |
| Account-level assumptions | ✅ (Plus) | ❌ | Gap |
| ML-based forecasting (Prophet, ARIMA) | ❌ (not offered) | ⚠️ Listed but not wired | **Opportunity** |

**Verdict**: Industry Standard charges $199/yr for forecasting. We have ML models (Prophet, ARIMA) that could surpass this if wired up. This is our biggest opportunity to differentiate.

---

### 6. AI Assistant

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Natural language queries | ✅ (CFP-trained) | ⚠️ Keyword matching only | **Critical** |
| "How much did I spend on X?" | ✅ | ✅ (keyword-based) | Partial |
| "Can I afford X?" | ✅ | ❌ | Gap |
| "When will I reach my goal?" | ✅ | ❌ | Gap |
| "What should I cut?" | ✅ | ⚠️ (basic tips) | Gap |
| Household context awareness | ✅ (household size, income) | ❌ | Gap |
| Context-aware multi-turn chat | ✅ | ❌ (single-turn) | Gap |
| Data privacy (no training on data) | ✅ (enterprise agreements) | N/A (client-side only) | — |
| Suggested questions | ✅ | ✅ | **Match** |
| Weekly recap | ✅ | ❌ | Gap |
| AI-powered insights | ✅ | ⚠️ (static hardcoded) | Gap |

**Verdict**: This is where we go beyond Industry Standard. See [The Personal AI Financial Assistant](#the-personal-ai-financial-assistant) section.

---

### 7. Reports & Analytics

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Spending by category chart | ✅ | ✅ | **Match** |
| Sankey diagram (money flow) | ✅ | ❌ | Gap |
| Custom date range reports | ✅ | ⚠️ (analytics only) | Partial |
| PDF export | ✅ | ❌ (browser print only) | Gap |
| CSV export | ✅ | ✅ | **Match** |
| Cash flow report | ✅ | ✅ (basic) | Close |
| Monthly/quarterly/annual summaries | ✅ | ✅ | **Match** |
| Top merchants analysis | ✅ | ✅ | **Match** |
| Day-of-week spending analysis | ✅ | ✅ | **Match** |
| Year-over-year comparison | ✅ | ✅ | **Match** |
| Tax summary report | ✅ | ❌ | Gap |
| Scheduled report generation | ✅ (email) | ❌ | Gap |

**Verdict**: Analytics are decent. Need: Sankey diagrams, PDF export, tax reports, scheduled emails.

---

### 8. Recurring Expenses & Subscriptions

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Auto-detect recurring transactions | ✅ | ✅ | **Match** |
| Calendar view for recurring | ✅ (color-coded) | ❌ | Gap |
| List view for recurring | ✅ | ✅ | **Match** |
| Bill reminders/alerts | ✅ | ❌ | Gap |
| Missed payment detection | ✅ (red indicator) | ❌ | Gap |
| Subscription cost summary | ✅ | ✅ (detected) | **Match** |
| Cancel reminders | ✅ | ❌ | Gap |
| Snooze/dismiss patterns | ✅ | ✅ | **Match** |
| Liability account bill sync | ✅ | ❌ | Gap |

**Verdict**: Detection is done. Need: calendar view, reminders, missed payment alerts.

---

### 9. Goals

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Goal creation with target + deadline | ✅ (v3 rebuilt June 2026) | ✅ | **Match** |
| Progress tracking | ✅ | ✅ | **Match** |
| Auto-contribution | ✅ | ✅ | **Match** |
| Goal projections ("when will I reach it?") | ✅ | ⚠️ (estimatedCompletion field) | Close |
| Multiple goal types | ✅ (Emergency, Vacation, etc.) | ✅ (goalType enum) | **Match** |
| Goal progress chart | ✅ | ✅ | **Match** |
| Debt payoff goals | ✅ | ❌ | Gap |
| Shared goals (couples) | ✅ | ❌ (single-user) | Gap |
| "What if I increase contribution?" | ✅ | ❌ | Gap |

**Verdict**: Goals are solid. Need: debt payoff type, contribution simulation, shared goals.

---

### 10. Accounts & Connectivity

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Plaid integration | ✅ (15,000+ institutions) | ✅ (sandbox) | Match* |
| CSV import | ✅ | ✅ | **Match** |
| PDF import | ❌ | ✅ (German bank statements!) | **FinBrain Advantage** |
| Multiple data providers | ✅ (Plaid, Finicity) | ✅ (Plaid only) | Close |
| Account types (checking, savings, credit, loan, investment, crypto) | ✅ | ✅ | **Match** |
| Manual account entry | ✅ | ✅ | **Match** |
| Connection status dashboard | ✅ | ❌ | Gap |
| Multi-currency | ❌ (limited international) | ✅ (7 currencies) | **FinBrain Advantage** |
| German/European bank support | ❌ | ✅ (PDF parser) | **FinBrain Advantage** |

**FinBrain advantages**: PDF import with German bank statements, multi-currency, European bank support. Industry Standard is US/Canada-focused.

---

### 11. Mobile & Cross-Platform

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| iOS app | ✅ (native) | ❌ | Gap |
| Android app | ✅ (native) | ❌ | Gap |
| Web app | ✅ | ✅ | **Match** |
| PWA support | ✅ | ⚠️ (manifest exists) | Partial |
| Offline mode | ✅ | ❌ | Gap |
| Push notifications | ✅ | ❌ | Gap |
| Cross-device sync | ✅ | ✅ (via API) | **Match** |
| Mobile widgets | ✅ | ❌ | Gap |

---

### 12. Security & Compliance

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| SOC 2 compliance | ✅ (announced Jan 2026) | ❌ | Gap |
| Bank-level encryption | ✅ | ✅ (Helmet, HTTPS) | **Match** |
| No ads / no data selling | ✅ (subscription model) | ✅ (no ads) | **Match** |
| Two-factor auth | ✅ | ❌ (Clerk handles) | Via Clerk |

---

### 13. Onboarding & UX

| Feature | Industry Standard | FinBrain | Status |
|---|---|---|---|
| Multi-step onboarding wizard | ✅ | ✅ (Industry Standard-style) | **Match** |
| Bank search in onboarding | ✅ | ✅ | **Match** |
| Trust signals (encryption, read-only) | ✅ | ✅ | **Match** |
| Dashboard empty state | ✅ | ✅ | **Match** |
| Customizable dashboard widgets | ✅ (drag-and-drop) | ❌ | Gap |
| Dark mode | ✅ | ✅ | **Match** |
| Glass-morphism design | ❌ | ✅ | **FinBrain Advantage** |
| Command palette (Cmd+K) | ✅ | ✅ (global search) | Close |

---

## Detailed Gap Analysis

### Critical Gaps (Must Fix to Compete)

1. **Investment Tracking** — We have the account type but zero portfolio intelligence. Industry Standard shows holdings, allocation, performance, top movers, and unrealized gains. We need: holdings model, market data API (Yahoo Finance / Alpha Vantage), allocation charts, performance tracking.

2. **Couples/Household** — Industry Standard's #1 differentiator. Separate logins, shared budgets, yours/mine/ours labels, transaction comments between partners, free partner access. This requires: Household model, shared access middleware, UI for multi-user views.

3. **AI Assistant** — Industry Standard has a CFP-trained assistant that answers natural language questions using real data. We have keyword matching. Need: LLM integration (OpenAI/Claude API), structured data context injection, multi-turn conversation, privacy-first design.

4. **Forecasting** — Industry Standard charges $199/yr for this. We already have Prophet and ARIMA in the ML service but haven't wired them up. Need: actual forecasting endpoints, scenario modeling, life event simulation.

### High Priority Gaps

5. **Reports — Sankey Diagrams** — Industry Standard's fan-favorite feature. Money flow visualization from income → categories → subcategories. Need: D3.js or Recharts Sankey component.

6. **Reports — PDF Export** — Server-side PDF generation (Puppeteer or PDFKit). Currently only browser print and CSV.

7. **Credit Score** — Industry Standard added this July 2025. Need: credit score API (Experian/TransUnion) or simulated tracking.

8. **Cash Flow Projection** — Industry Standard projects months ahead using recurring transactions. We have basic linear extrapolation. Need: recurring-aware projection, account balance forecasting.

9. **Mobile Apps** — Industry Standard is iOS + Android. We're web-only. Consider: React Native wrapper or Capacitor PWA.

### Medium Priority Gaps

10. **Budget Alerts** — Threshold notifications (50%, 75%, 90%, 100%). We have the Notification model but no routes.

11. **Recurring Calendar View** — Color-coded calendar for bills/subscriptions. Calendar view was built but removed from current branch.

12. **Notifications Center** — Model exists, no UI. Need: notification routes, in-app bell icon, read/unread state.

13. **Flex Budgeting** — Three-bucket approach (fixed, non-monthly, flexible). Alternative to category-only budgets.

14. **Customizable Dashboard** — Drag-and-drop widgets. Currently hardcoded layout.

### Low Priority (But Nice)

15. **Tax Summary Report** — Filter expenses by category for tax purposes.
16. **Scheduled Reports** — Email delivery of monthly/quarterly reports.
17. **Financial Advisor Access** — Share read-only view with advisor.
18. **Business Tracking** — Separate P&L for freelancers/side hustles (Industry Standard Plus feature).
19. **Offline Mode** — IndexedDB for offline transaction creation + background sync.
20. **Push Notifications** — Mobile push for budget alerts, bill reminders.

---

## Industry Standard's Full Feature Set

### Core (Core Plan — $99.99/yr)

| Feature | Description |
|---|---|
| **Account Aggregation** | 15,000+ institutions via Plaid, Finicity, and others |
| **Transaction Tracking** | Auto-categorized, searchable, filterable list |
| **Budgeting** | Flex (3-bucket) or Category (per-category limits) |
| **Net Worth** | Real-time across all accounts, historical trends |
| **Investment Tracking** | Stocks, bonds, ETFs, crypto, 401k/IRA, allocation |
| **Goals** | Savings targets, progress tracking, auto-contribution |
| **Recurring** | Auto-detected subscriptions/bills, calendar view |
| **Reports** | Sankey diagrams, custom date ranges, spending analytics |
| **Cash Flow Projection** | Months-ahead forecast using recurring transactions |
| **AI Assistant** | CFP-trained natural language queries on your data |
| **AI Insights** | Auto-generated spending anomalies, trends, alerts |
| **Weekly Recap** | Automated weekly financial summary |
| **Couples** | Separate logins, shared budgets, yours/mine/ours |
| **Shared Views** | Partners see combined or individual spending |
| **Transaction Comments** | Partners can discuss individual transactions |
| **Credit Score** | Tracking and monitoring |
| **Receipt Scanning** | OCR for receipt images |
| **CSV Import** | Transaction import from files |
| **Bill Reminders** | Upcoming payment alerts |
| **Dashboard** | Customizable widgets, drag-and-drop |
| **Mobile Apps** | iOS + Android, full feature parity |
| **SOC 2 Security** | Independently audited |

### Plus Tier (Plus — $199/yr, adds)

| Feature | Description |
|---|---|
| **Forecasting** | Multi-year projections with life events |
| **Retirement Modeling** | "When can I retire?" scenarios |
| **Home Purchase Modeling** | Impact of buying a home on finances |
| **Career Break Modeling** | What if you take a sabbatical? |
| **Life Events** | Have a kid, new job, Social Security |
| **Business Tracking** | Separate P&L for freelancers/rentals |
| **Advanced Investment Analysis** | Unrealized gains/losses, detailed allocation |
| **Scenario Comparison** | Side-by-side what-if modeling |
| **Inflation/Growth Assumptions** | Configurable economic parameters |

---

## FinBrain's Current State

### What We Have (Solid)

| Feature | Quality |
|---|---|
| Transaction CRUD | ✅ Full (create, read, update, soft delete, bulk, restore, search, filter, sort) |
| Categories | ✅ Full (CRUD, auto-seed, hierarchy-ready schema, color picker) |
| ML Categorization | ✅ Best-in-class (XLM-RoBERTa transformer, 86.5% accuracy, 10 categories, multilingual) |
| Budgets | ✅ Good (CRUD, rollover, history, spent tracking) |
| Goals | ✅ Good (CRUD, contributions, progress, auto-contribute, estimated completion) |
| Accounts | ✅ Good (7 types, net worth calculation, historical trends) |
| Analytics | ✅ Good (monthly trends, category breakdown, top merchants, YoY, day-of-week) |
| Reports | ⚠️ Basic (monthly/quarterly/annual, CSV export, browser print) |
| Plaid Integration | ✅ Working (sandbox, link token, exchange, sync) |
| CSV/PDF Import | ✅ Strong (German bank statements, ML auto-categorization, opening balance) |
| Receipt OCR | ✅ Working (Tesseract, merchant/amount/date extraction) |
| Recurring Detection | ✅ Working (auto-detect, snooze/dismiss/restore) |
| Multi-Currency | ✅ Working (7 currencies, conversion) |
| Global Search | ✅ Working |
| Auth | ✅ Working (Clerk + dev fallback) |
| Onboarding | ✅ Polished (Industry Standard-style wizard) |
| Dashboard | ✅ Good (stat cards, charts, recent transactions) |
| AI Chat | ⚠️ Basic (keyword matching, single-turn, no real reasoning) |
| Net Worth | ✅ Working (calculation + history) |
| Dark Mode + Glass UI | ✅ Distinctive design |

### What We're Missing (vs Industry Standard)

| Missing Feature | Effort | Impact |
|---|---|---|
| Investment portfolio/holdings | Large | Critical |
| Couples/household | Very Large | Critical |
| Real AI assistant (LLM-based) | Medium | Critical |
| Forecasting (Prophet/ARIMA wired up) | Medium | High |
| Sankey diagrams | Medium | High |
| PDF export | Small | High |
| Credit score | Medium | High |
| Cash flow projection (recurring-aware) | Medium | High |
| Budget alerts | Small | Medium |
| Recurring calendar view | Small | Medium |
| Notification center | Small | Medium |
| Flex budgeting | Medium | Medium |
| Customizable dashboard | Medium | Medium |
| Mobile apps (React Native) | Very Large | High |

---

## The Personal AI Financial Assistant

> **This is our killer feature.** Industry Standard has an AI assistant, but it's designed for general users — it answers questions about your data. We go deeper: **a personal financial advisor that knows your complete financial context and helps you make decisions.**

### What Industry Standard's AI Does

- "How much did I spend on groceries last month?"
- "Why did my net worth change?"
- "What subscriptions am I paying for?"
- "How does my savings rate compare to benchmarks?"

It's **descriptive** — it tells you what happened.

### What Our AI Will Do (Personal Financial Advisor)

Our assistant doesn't just describe — it **advises**. It has full context:

```
User context:
- Monthly income: €3,200
- Monthly expenses: €2,100 (avg over 3 months)
- Savings rate: 34.4%
- Current budgets: Food €400, Transport €150, Entertainment €100
- Goals: Emergency Fund (65% complete, €3,250/€5,000), Vacation (30% complete, €900/€3,000)
- Recurring: Netflix €15.99, Gym €39.99, Insurance €89, Rent €850
- Recent spending pattern: Dining out up 23% this month
- Account balances: Checking €4,200, Savings €8,500
- Debt: None
- Risk profile: Conservative
```

### Decision Support Scenarios

| User Question | What Our AI Answers |
|---|---|
| "Should I buy a new laptop for €1,200?" | "Based on your current savings rate (34.4%) and checking balance (€4,200), you can afford this without impacting your Emergency Fund goal. However, it will delay your Vacation goal by approximately 2.3 months. Your next income deposit is in 8 days (€3,200). I'd recommend waiting until after that deposit and buying it then — you'll still have €3,000+ in checking as a buffer." |
| "Is it okay to increase my rent to €1,000?" | "An increase of €150/month would reduce your savings rate from 34.4% to 29.7%. This still exceeds the recommended 20% minimum, but would delay your Emergency Fund completion by 1.8 months and your Vacation goal by 3.1 months. If you cut Entertainment spending by €50/month, the impact drops to 1.2 months delay." |
| "Should I cancel my gym membership?" | "Your gym costs €39.99/month (€480/year). You've used it 4 times this month. At €10/visit, it's above average gym value. Canceling would accelerate your Vacation goal by 1.7 months. However, if you're using it for health, consider that healthcare costs typically increase without exercise — the long-term savings may justify the expense." |
| "Can I afford to take a 3-month career break?" | "With €8,500 in savings and €2,100/month expenses, you have 4.0 months of runway. Taking 3 months off would leave you with ~€2,200 in savings (1 month buffer). This is below the recommended 3-6 month emergency fund. I'd suggest building your Emergency Fund to €12,000 first, which would take ~5.5 months at your current savings rate." |
| "What's the best way to pay off my credit card?" | "You have no outstanding debt. If you're planning to use a credit card, I'd recommend paying it in full each month given your strong savings rate. With your checking balance of €4,200, you can comfortably cover any single-month expenses while earning interest in savings." |

### Architecture

```
┌─────────────────────────────────────────────────┐
│              User Question                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         Context Builder (API route)              │
│  - Pulls transactions, budgets, goals, accounts │
│  - Computes: savings rate, spending trends,     │
│    budget utilization, goal projections          │
│  - Builds structured context JSON               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         LLM with System Prompt                   │
│  "You are a personal financial advisor.         │
│   Here is the user's COMPLETE financial data.   │
│   Answer whether [decision] is a good idea.     │
│   Consider: cash flow, goals, emergency fund,   │
│   savings rate, upcoming expenses, risk."        │
│                                                  │
│  Model: GPT-4o-mini (cheap) or Claude Haiku     │
│  Privacy: Data NOT stored, NOT used for training│
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         Response + Reasoning                     │
│  - Direct answer (yes/no/it depends)            │
│  - Financial reasoning with numbers             │
│  - Impact analysis (goals, savings, cash flow)  │
│  - Recommendation with alternatives             │
│  - Confidence level                             │
└─────────────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Context Engine (Backend)
- Create `/api/v1/ai/context` endpoint that builds a complete financial snapshot
- Include: income trends, expense breakdown, budget status, goal progress, account balances, recurring commitments, recent anomalies
- Compute derived metrics: savings rate, months of runway, budget health score, goal velocity

#### Phase 2: LLM Integration
- Add OpenAI/Claude API integration (configurable, user-provided key preferred)
- System prompt that includes: user's financial context JSON, role as financial advisor, output format requirements
- Structured response parsing: decision + reasoning + impact + recommendation
- Token-efficient context building (summarize, don't dump raw transactions)

#### Phase 3: Decision Interface
- "Ask about a decision" input on dashboard, insights page, and as a standalone page
- Pre-built decision templates: "Can I afford [X]?", "Should I [action]?", "What if [scenario]?"
- Response cards with: answer, reasoning, impact visualization, alternative suggestions
- Conversation history (multi-turn, session-based, not persisted)

#### Phase 4: Smart Proactive Advice
- Weekly "Financial Decision Brief" — proactive alerts about upcoming decisions
- Budget overspend warnings with specific recommendations
- Goal trajectory updates ("At current pace, you'll reach your goal 2 weeks early")
- Unusual spending pattern detection with context ("Your dining spend is up 23% — this will delay your Vacation goal by 1 month if it continues")

### Why This Beats Industry Standard

| Aspect | Industry Standard AI | FinBrain AI |
|---|---|---|
| **Focus** | Descriptive ("what happened") | Prescriptive ("what should I do") |
| **Context depth** | Transaction data | Transactions + budgets + goals + projections + patterns |
| **Decision support** | ❌ | ✅ "Is this a good financial decision?" |
| **Impact analysis** | ❌ | ✅ Shows effect on goals, savings, runway |
| **Alternative suggestions** | ❌ | ✅ "Instead, consider..." |
| **Proactive advice** | ✅ (Weekly recap) | ✅ (Decision briefs + anomaly alerts) |
| **Multi-turn conversation** | ✅ | ✅ (Phase 3) |
| **Privacy** | Enterprise agreements | User-provided API keys, no server storage |

---

## Implementation Roadmap

### Wave 1: Close the Critical Gaps (Weeks 1–4)

| # | Feature | Effort | Files |
|---|---|---|---|
| 1.1 | **LLM AI Assistant** — Replace keyword matching with OpenAI/Claude integration | 2 weeks | `apps/api/src/routes/ai.ts`, `apps/web/src/lib/ai-chat.ts`, `apps/web/src/pages/insights.tsx` |
| 1.2 | **Investment Holdings** — Model, API, and portfolio UI | 2 weeks | `apps/api/prisma/schema.prisma`, `apps/api/src/routes/investments.ts`, `apps/web/src/pages/investments.tsx` |
| 1.3 | **Budget Alerts** — Wire up Notification model, threshold triggers | 3 days | `apps/api/src/routes/notifications.ts`, `apps/web/src/components/notifications.tsx` |

### Wave 2: Forecasting & Analytics (Weeks 5–8)

| # | Feature | Effort | Files |
|---|---|---|---|
| 2.1 | **ML Forecasting** — Wire Prophet/ARIMA to actual prediction endpoints | 2 weeks | `apps/ml-service/src/routes/forecast.py`, `apps/api/src/routes/forecast.ts` |
| 2.2 | **Sankey Diagrams** — Money flow visualization on reports page | 1 week | `apps/web/src/components/finance/sankey.tsx`, `apps/web/src/pages/reports.tsx` |
| 2.3 | **PDF Export** — Server-side PDF generation for reports | 1 week | `apps/api/src/routes/reports.ts` (PDF endpoint) |
| 2.4 | **Cash Flow Projection** — Recurring-aware, months-ahead forecasting | 1 week | `apps/web/src/pages/analytics.tsx` |

### Wave 3: Feature Parity (Weeks 9–14)

| # | Feature | Effort | Files |
|---|---|---|---|
| 3.1 | **Couples/Household** — Multi-user model, shared access, UI | 4 weeks | `apps/api/prisma/schema.prisma`, `apps/api/src/middleware/household.ts`, `apps/web/src/pages/household.tsx` |
| 3.2 | **Credit Score** — API integration or simulated tracking | 1 week | `apps/api/src/routes/credit-score.ts`, `apps/web/src/pages/credit-score.tsx` |
| 3.3 | **Recurring Calendar View** — Color-coded bill calendar | 1 week | `apps/web/src/pages/recurring.tsx` (calendar tab) |
| 3.4 | **Flex Budgeting** — Three-bucket budget mode | 1 week | `apps/api/src/routes/budgets.ts`, `apps/web/src/pages/budgets.tsx` |

### Wave 4: Polish & Mobile (Weeks 15–20)

| # | Feature | Effort | Files |
|---|---|---|---|
| 4.1 | **Notification Center** — In-app bell, read/unread, preferences | 1 week | `apps/web/src/components/notifications.tsx` |
| 4.2 | **Customizable Dashboard** — Drag-and-drop widgets | 2 weeks | `apps/web/src/pages/dashboard.tsx` |
| 4.3 | **Tax Summary Report** — Filter by category for deductions | 3 days | `apps/web/src/pages/reports.tsx` |
| 4.4 | **Scheduled Reports** — Email monthly summaries | 1 week | `apps/api/src/workers/report-email.ts` |
| 4.5 | **Mobile Apps** — React Native wrapper or Capacitor PWA | 4 weeks | New `apps/mobile/` |

### Wave 5: Beyond Industry Standard (Weeks 21+)

| # | Feature | Effort | Description |
|---|---|---|---|
| 5.1 | **Proactive Decision Briefs** | 1 week | Weekly AI-generated email with upcoming financial decisions |
| 5.2 | **Anomaly Explanation** | 1 week | AI explains why a transaction is unusual in context |
| 5.3 | **Subscription Optimization** | 3 days | AI analyzes usage patterns and recommends cancellations |
| 5.4 | **German Tax Report** | 1 week | Expense categorization for German tax filing (EÜR) |
| 5.5 | **Receipt Auto-Match** | 1 week | Match receipts to existing transactions automatically |
| 5.6 | **Webhook System** | 1 week | Let users build custom integrations |

---

## Priority Matrix

```
                        HIGH IMPACT
                            │
     ┌──────────────────────┼──────────────────────┐
     │                      │                      │
     │  LLM AI Assistant    │  Couples/Household   │
     │  Investment Tracking │  Mobile Apps         │
     │  ML Forecasting      │  Credit Score        │
     │  Sankey Diagrams     │                      │
     │                      │                      │
HIGH ├──────────────────────┼──────────────────────┤ LOW
EFFORT│                     │                      │ EFFORT
     │  Budget Alerts       │  PDF Export          │
     │  Recurring Calendar  │  Flex Budgeting      │
     │  Notification Center │  Tax Summary         │
     │  Cash Flow Projection│  Customizable Dash   │
     │                      │                      │
     └──────────────────────┼──────────────────────┘
                            │
                        LOW IMPACT
```

### What to Build First (ROI Ranking)

1. **LLM AI Assistant** — Medium effort, massive differentiation. This is our "Personal Financial Advisor" that goes beyond Industry Standard.
2. **Investment Tracking** — Large effort, critical gap. Without this, we can't compete as an all-in-one finance app.
3. **ML Forecasting** — Medium effort, we already have the models. Just wire them up.
4. **PDF Export** — Small effort, high perceived value. Users expect PDF reports.
5. **Sankey Diagrams** — Medium effort, visually impressive, Industry Standard's fan-favorite.
6. **Budget Alerts** — Small effort, high engagement. Push users back into the app.
7. **Couples/Household** — Very large effort, but Industry Standard's biggest moat. Consider this for v2.

---

## Our Advantages Over Industry Standard

While we have gaps to close, FinBrain already has features Industry Standard doesn't:

| Advantage | Description |
|---|---|
| **German Bank Statement Support** | PDF parser for Lastschrift, Überweisung, DD.MM.YYYY dates, comma decimals. Industry Standard is US/Canada only. |
| **ML-Powered Categorization** | XLM-RoBERTa transformer (86.5% accuracy, multilingual). Industry Standard uses basic rules + third-party categorization. |
| **Multi-Currency (7 currencies)** | Native support with conversion. Industry Standard has limited international support. |
| **Glass-Morphism UI** | Distinctive dark emerald design. Industry Standard is clean but generic. |
| **Self-Hosted Option** | Docker Compose for local/cloud deployment. Industry Standard is SaaS-only. |
| **Open Source Potential** | Could become the open-source Industry Standard alternative. |
| **Receipt OCR + PDF Import** | Parse German PDFs directly. Industry Standard only does receipt photos. |
| **Custom ML Training** | User corrections feed back into model retraining. Industry Standard doesn't learn from corrections. |

---

## Summary

### The Path to Industry Standard Parity

| Milestone | Timeline | Key Deliverables |
|---|---|---|
| **M1: AI Advisor** | Weeks 1-2 | LLM-powered decision advisor, context engine |
| **M2: Investments** | Weeks 3-4 | Portfolio holdings, allocation charts, market data |
| **M3: Intelligence** | Weeks 5-8 | ML forecasting, Sankey diagrams, PDF export |
| **M4: Parity** | Weeks 9-14 | Couples, credit score, flex budgets, calendar view |
| **M5: Polish** | Weeks 15-20 | Mobile, notifications, customizable dashboard |
| **M6: Beyond** | Weeks 21+ | Proactive advice, tax reports, webhooks |

### The Differentiator

Industry Standard is a **financial tracker**. FinBrain will be a **financial advisor**.

Industry Standard shows you where your money went. FinBrain tells you where it should go.

The AI assistant isn't a chatbot — it's a personal financial advisor that knows your complete financial picture and helps you make decisions, not just understand the past.

---

> *This document is a living plan. Update as features are implemented.*
