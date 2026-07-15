# Monarch Money vs FinBrain — Gap Analysis

> **Date**: July 2026
> **Purpose**: Comprehensive audit of where FinBrain falls short of Monarch Money's standard and quality, with prioritized remediation plan.
> **Last Updated**: July 15, 2026 — Phases A+B + Quality Polish Phases 1-3 complete

---

## Executive Summary

FinBrain has a solid foundation with **16 pages**, **ML-powered categorization**, and good accessibility polish. However, Monarch Money sets the bar for what a premium personal finance app should feel like. The gaps fall into three categories:

1. **Feature gaps** — Missing functionality that Monarch offers
2. **Quality/UX gaps** — Existing features that aren't polished enough
3. **Infrastructure gaps** — Missing foundational capabilities

**Estimated effort to reach Monarch parity**: ~4-6 weeks of focused development (reduced from 6-8 after completed work).

---

## 1. DASHBOARD

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Customizable widget layout (drag/drop reorder, hide/show) | ✅ Full | ❌ Fixed layout | **CRITICAL** |
| Net worth mini-chart on dashboard | ✅ | ❌ Only on Accounts page | HIGH |
| Budget utilization quick-view widget | ✅ | ❌ | HIGH |
| Goal progress widget | ✅ | ❌ | HIGH |
| Upcoming bills/recurring widget | ✅ Calendar + list | ❌ | HIGH |
| Monthly review card (AI-generated summary) | ✅ Swipe-through | ❌ | HIGH |
| Spending forecast widget | ✅ | ❌ | MEDIUM |
| Credit score widget | ✅ | ❌ N/A | LOW |
| Investment performance widget | ✅ | ❌ | MEDIUM |
| Transaction review/flagged items widget | ✅ | ❌ | MEDIUM |
| Real AI insights (not hardcoded) | ✅ AI assistant | ✅ **DONE** | ~~CRITICAL~~ |
| "Ask FinBrain" chat actually working | ✅ | ✅ **DONE** | ~~CRITICAL~~ |
| Notification count on bell | ✅ | ✅ **DONE** | ~~HIGH~~ |
| Notification dropdown with mark-as-read | ✅ | ✅ **DONE** | HIGH |

### What to Build
- [ ] **Dashboard widget system**: Draggable grid with `react-beautiful-dnd` or `@dnd-kit`. Each widget is a card that can be reordered, shown/hidden. Save layout to user preferences.
- [ ] **Net worth mini-chart widget**: Sparkline on dashboard (reuse `NetWorthTrend` component).
- [ ] **Budget summary widget**: Show top 3-5 budgets with progress bars.
- [ ] **Goal progress widget**: Show goals nearing deadline with progress.
- [ ] **Recurring/bills upcoming widget**: Next 5 upcoming bills with amounts.
- [x] **Connect real AI insights**: ✅ Wired `lib/insights.ts` shared utility to dashboard. Generated dynamically from transactions, categories, budgets, goals.
- [x] **Wire "Ask FinBrain"**: ✅ Connected chat input to `generateAnswer()` with message history, thinking state, keyboard handler.
- [x] **Notification bell**: ✅ Queries `/notifications/unread-count`, shows red badge. Dropdown panel with list, mark-all-read, individual read.

---

## 2. TRANSACTIONS

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Split transactions | ✅ By $ or % | ❌ | **CRITICAL** |
| Transaction tags/labels | ✅ Multiple per txn | ❌ Only categories | HIGH |
| Transaction review queue | ✅ Swipe to review | ❌ | HIGH |
| Receipt attachment on transactions | ✅ Images + PDF | ❌ `receiptUrl` in schema, no UI | HIGH |
| Duplicate detection on import | ✅ | ❌ | HIGH |
| Notes visible in table | ✅ | ❌ Only in form | MEDIUM |
| Hide transactions | ✅ From budget/cash flow | ❌ | MEDIUM |
| Assign owner (couples) | ✅ | ❌ Single user only | LOW |
| Optimistic updates | ✅ Instant UI | ✅ **DONE** | ~~HIGH~~ |
| Undo on delete | ✅ | ✅ **DONE** | ~~HIGH~~ |
| Bulk category reassignment | ✅ Edit multiple | ❌ Bulk delete only | HIGH |
| Retail sync (Amazon/Target split) | ✅ | ❌ | LOW |
| Search with natural language | ✅ "show Amazon from last month" | ❌ Basic text search | MEDIUM |

### What to Build
- [ ] **Split transactions**: UI to split a transaction into 2+ parts with different categories/amounts. Add `splits` JSON field to Transaction model or create `TransactionSplit` table.
- [ ] **Tags system**: Add `Tag` model + `TransactionTag` join table. UI for creating tags, multi-select on transaction form, tag filter in transaction list.
- [ ] **Transaction review queue**: "Review" page showing uncategorized or flagged transactions. Swipe/button to approve, recategorize, or hide.
- [ ] **Receipt attachment**: File upload on transaction form. Store in cloud storage, display thumbnail in expanded row.
- [ ] **Duplicate detection**: Hash-based (amount + date + merchant) or fuzzy match during import. Show warnings before saving.
- [x] **Optimistic updates**: ✅ All CRUD operations update UI immediately. Create, edit, delete all optimistic with rollback on error.
- [x] **Undo toast**: ✅ After delete, toast with "Undo" button restores within 5s. Works for single + bulk delete on transactions, budgets, goals, categories.
- [ ] **Bulk category reassignment**: Checkboxes + "Change Category" action in bulk toolbar.

---

## 3. BUDGETS

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Rollover budgets | ✅ Carry unused to next month | ❌ | **CRITICAL** |
| Flex budgeting (Fixed/Flexible/Non-monthly) | ✅ Default mode | ❌ Only category-based | HIGH |
| Budget history view | ✅ Previous months | ❌ `BudgetHistory` model unused | HIGH |
| Remaining per day calculation | ✅ | ❌ | MEDIUM |
| Budget alerts/notifications | ✅ Push/email at 50/75/90/100% | ❌ Only visual badge | HIGH |
| Budget vs actual chart over time | ✅ | ❌ | HIGH |
| Budget templates | ✅ Copy month-to-month | ❌ | MEDIUM |
| Group-level rollover | ✅ | ❌ | LOW |
| Edit end date | ✅ | ❌ Only start date | LOW |
| Optimistic create/edit | ✅ | ✅ **DONE** | HIGH |

### What to Build
- [ ] **Rollover toggle**: Per-category "rollover" flag. At month-end, carry surplus/deficit to next month's budget. Add `rollover` boolean + `rolloverAmount` to Budget model.
- [ ] **Flex budget mode**: Three-bucket view (Fixed, Flexible, Non-monthly). User assigns categories to each bucket. Add `budgetMode` user preference.
- [ ] **Budget history**: Populate `BudgetHistory` model on month-end. Show previous months' budgets with spent vs budgeted.
- [ ] **Daily remaining**: Calculate `remaining / daysLeftInPeriod` and display on budget card.
- [ ] **Budget alerts**: When spending crosses 50/75/90/100% thresholds, create a notification record. Optionally send email.
- [ ] **Budget vs actual chart**: Line chart comparing budgeted amount vs actual spending over 3-6 months.

---

## 4. GOALS

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Goal-to-account linking | ✅ Link specific account | ❌ | HIGH |
| Pay-down goals (debt tracking) | ✅ | ❌ Only save-up goals | HIGH |
| Auto-contributions from budget | ✅ | ❌ Manual only | MEDIUM |
| Goal forecast (projected completion) | ✅ | ❌ Schema field exists, unused | HIGH |
| On-track/behind status with reasoning | ✅ | ⚠️ Basic "behind schedule" banner | MEDIUM |
| Optimistic create/edit | ✅ | ✅ **DONE** | HIGH |
| Goal sharing (couples) | ✅ | ❌ | LOW |
| Milestone celebrations | ✅ | ❌ | LOW |
| Suggested goals | ✅ Based on patterns | ❌ | LOW |

### What to Build
- [ ] **Account linking**: Add `linkedAccountId` to Goal model. UI dropdown to select an account. Auto-update progress from account balance.
- [ ] **Pay-down goals**: New goal type for debt. Track starting balance, current balance, payoff date. Show interest savings.
- [ ] **Goal forecast**: Use current savings rate to project completion date. Display "At current rate, you'll reach this goal by [date]".
- [ ] **Auto-contributions**: Allow setting a monthly auto-contribution amount that creates a recurring transaction.
- [ ] **Better on-track status**: Show "You need to save $X/month to stay on track" with specific guidance.

---

## 5. ACCOUNTS / NET WORTH

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Account editing | ✅ | ✅ **DONE** | ~~HIGH~~ |
| Per-account transaction list | ✅ Click account → transactions | ✅ **DONE** | ~~HIGH~~ |
| Account grouping by institution | ✅ | ❌ | MEDIUM |
| Manual accounts (real estate, vehicle) | ✅ With Zillow/VIN | ⚠️ Type exists, no value tracking | MEDIUM |
| Investment detail view | ✅ Holdings, allocation, performance | ❌ | HIGH |
| Account reconciliation | ✅ | ❌ | MEDIUM |
| Net worth chart with filters | ✅ By account type, date range | ⚠️ Basic line chart | MEDIUM |
| Year-to-date net worth | ✅ | ❌ | LOW |

### What to Build
- [x] **Account edit**: ✅ Edit button (pencil icon) on account cards. Modal with name, type, balance, institution. Optimistic update.
- [x] **Per-account transactions**: ✅ Click account card → modal with filtered transaction list for that account.
- [ ] **Account grouping**: Group accounts by institution (e.g., "Chase" group with checking + credit card).
- [ ] **Investment detail**: Holdings table, asset allocation pie chart, performance line chart, gain/loss per holding.
- [ ] **Account reconciliation**: Mark transactions as "reconciled" against bank statement balance.

---

## 6. REPORTS & ANALYTICS

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Sankey diagram (cash flow visualization) | ✅ Fan-favorite | ❌ | **CRITICAL** |
| Custom date range picker | ✅ | ❌ Fixed periods only | HIGH |
| Saved/bookmarked reports | ✅ | ❌ | HIGH |
| Report comparison (period vs period) | ✅ | ⚠️ Basic % change only | MEDIUM |
| Spending by merchant report | ✅ | ⚠️ Top 5 only on Reports page | MEDIUM |
| Cash flow analysis | ✅ | ❌ | HIGH |
| Income breakdown by source | ✅ | ❌ | MEDIUM |
| Shareable reports (image/URL) | ✅ | ❌ | LOW |
| Tax-deductible expense report | ✅ | ❌ | MEDIUM |
| PDF report generation | ✅ | ❌ Print only | LOW |

### What to Build
- [ ] **Sankey diagram**: Use `react-sankey` or `d3-sankey` to visualize income → category flow. This is Monarch's most visually impressive feature.
- [ ] **Custom date range**: Date picker component for all reports/analytics pages.
- [ ] **Saved reports**: Let users save filter combinations. Store in `SavedReport` table.
- [ ] **Cash flow page**: Dedicated page showing money in vs money out over time with breakdowns.
- [ ] **Tax report**: Filter transactions by "tax deductible" tag, show summary for tax prep.

---

## 7. RECURRING / BILLS

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Persistent pattern storage | ✅ DB-stored | ❌ In-memory only | **CRITICAL** |
| Calendar view | ✅ Color-coded | ❌ | **CRITICAL** |
| Bill sync (Spinwheel integration) | ✅ Real bill data | ❌ | LOW |
| Snooze/dismiss patterns | ✅ | ❌ | HIGH |
| Edit frequency/amount | ✅ | ❌ | HIGH |
| Payment reminders (push/email) | ✅ 3 days before | ❌ | HIGH |
| Subscription cost summary | ✅ | ⚠️ Basic summary cards | MEDIUM |
| Confidence indicator | ✅ | ❌ | LOW |
| Mark as paid | ✅ | ❌ | HIGH |

### What to Build
- [ ] **RecurringPattern model**: Persist detected patterns to DB. Fields: merchant, amount, frequency, category, nextDueDate, confidence, isActive.
- [ ] **Calendar view**: Monthly calendar with color-coded dots for upcoming/recurring bills. Use `react-big-calendar` or custom.
- [ ] **Edit/snooze**: UI to edit pattern details or dismiss false positives.
- [ ] **Payment reminders**: Create notification 3 days before due date.
- [ ] **Mark as paid**: Button to manually mark a bill as paid.
- [ ] **Subscription total**: Show total monthly subscription cost with category breakdown.

---

## 8. SETTINGS & PROFILE

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Bank connection management | ✅ View/disconnect institutions | ❌ | HIGH |
| Notification preferences | ✅ Email/push/in-app toggles | ❌ | HIGH |
| Profile picture upload | ✅ | ❌ `avatarUrl` exists, no UI | MEDIUM |
| Import history | ✅ | ❌ | MEDIUM |
| Theme customization | ✅ Light/dark | ⚠️ Dark only | MEDIUM |
| Household/member management | ✅ | ❌ Single user | LOW |
| Merchant management (rename/merge) | ✅ | ❌ | MEDIUM |
| Category management (groups, reorder) | ✅ | ⚠️ Basic CRUD, no groups | MEDIUM |

### What to Build
- [ ] **Connection management**: Show connected Plaid institutions, allow disconnect/reconnect.
- [ ] **Notification preferences**: Toggle switches for email/in-app notifications per alert type.
- [ ] **Profile picture upload**: File upload, store in cloud storage, display in header.
- [ ] **Import history**: Log past CSV/PDF imports with timestamp, row count, status.
- [ ] **Theme toggle**: Light/dark mode switch (currently dark only).
- [ ] **Merchant management**: Rename merchants globally, merge duplicate merchants.

---

## 9. ML / AI

| Feature | Monarch | FinBrain | Gap |
|---------|---------|----------|-----|
| Real LLM assistant | ✅ Natural language Q&A grounded in data | ⚠️ Pattern-matching, context-aware | MEDIUM |
| Spending forecast | ✅ Multiple scenarios | ❌ Models listed "in development" | **CRITICAL** |
| Anomaly detection | ✅ | ❌ | HIGH |
| Personalized recommendations | ✅ | ❌ `Recommendation` model unused | HIGH |
| Category budget suggestions | ✅ Based on history | ❌ | MEDIUM |
| Weekly recap email | ✅ | ❌ | LOW |
| AI-powered reporting | ✅ Natural language report queries | ❌ | MEDIUM |

### What to Build
- [ ] **LLM integration**: Connect to OpenAI/Anthropic API. Ground responses in user's transaction data. System prompt with financial context.
- [ ] **Spending forecast**: Implement ARIMA/Prophet models. Show 30/60/90 day projections with confidence intervals.
- [ ] **Anomaly detection**: Z-score/IQR based outlier detection on transaction amounts. Flag unusual spending.
- [ ] **Recommendations engine**: Generate actionable suggestions based on spending patterns (e.g., "You could save $X by reducing dining out").
- [ ] **Budget suggestions**: Analyze 3 months of spending to suggest category budgets.

---

## 10. ENTIRELY MISSING FEATURES

These features exist in Monarch but have zero implementation in FinBrain:

| Feature | Monarch | Priority | Effort |
|---------|---------|----------|--------|
| **Multi-user / household** | ✅ Free partner sharing | LOW | HIGH |
| **Credit score tracking** | ✅ Monthly updates | LOW | MEDIUM |
| **Investment portfolio view** | ✅ Holdings, allocation, performance | HIGH | HIGH |
| **Calendar view (bills/transactions)** | ✅ Color-coded monthly | HIGH | MEDIUM |
| **Sankey cash flow diagram** | ✅ Interactive, shareable | HIGH | MEDIUM |
| **Flex budgeting mode** | ✅ Fixed/Flexible/Non-monthly | HIGH | MEDIUM |
| **Transaction review queue** | ✅ Swipe to review | HIGH | MEDIUM |
| **Bill sync (Spinwheel)** | ✅ Real bill data | LOW | HIGH |
| **Mobile app** | ✅ iOS + Android | MEDIUM | VERY HIGH |
| **PWA / offline support** | ✅ | MEDIUM | HIGH |
| **Push notifications** | ✅ | HIGH | MEDIUM |
| **Email reports** | ✅ | LOW | MEDIUM |
| **Real estate/vehicle tracking** | ✅ Zillow/VIN | LOW | MEDIUM |
| **Debt payoff planner** | ✅ | MEDIUM | MEDIUM |
| **Tax categorization** | ✅ | MEDIUM | LOW |
| **Merchant management** | ✅ Rename/merge | MEDIUM | LOW |

---

## PRIORITIZED REMEDIATION PLAN

### Phase A — Critical UX Parity ✅ COMPLETED (July 15, 2026)
> These make FinBrain feel like a real competitor, not a demo.

1. ✅ **Wire "Ask FinBrain" chat** — Connected decorative input to `generateAnswer()` with chat message history, thinking state, keyboard handler
2. ✅ **Wire real AI insights** — Replaced hardcoded dashboard text with computed insights from `lib/insights.ts` (spending alerts, goal progress, budget warnings, income analysis)
3. ✅ **Notification bell with real count** — Queries `/notifications/unread-count`, shows red badge with count
4. ✅ **Optimistic updates** — All CRUD operations update UI immediately: transactions, budgets, goals, categories, accounts
5. ✅ **Undo toast on delete** — 5-second undo window after deleting transactions (single + bulk), budgets, goals, categories
6. ✅ **Account edit** — Edit button (pencil icon) on account cards. Modal with name, type, balance, institution
7. ✅ **Per-account transaction list** — Click account card → modal showing filtered transaction list

### Phase B — Perceived Performance ✅ COMPLETED (July 15, 2026)
> These make the app feel instant and native.

8. ✅ **Optimistic create/edit** — Budgets and categories forms update instantly on save
9. ✅ **Page transitions** — framer-motion fade/slide between all 16 routes
10. ✅ **Notification dropdown** — Bell opens dropdown panel with notification list, mark-all-read, individual mark-as-read

### Phase C — Feature Parity Core (Week 3-4) ← NEXT
> These are the features users expect from a premium finance app.

11. **Rollover budgets** — Carry unused budget to next month
12. **Budget history** — Show previous months' budgets (populate existing `BudgetHistory` model)
13. **Recurring pattern persistence** — Store patterns in DB, allow edit/snooze
14. **Calendar view** — Monthly view of upcoming bills and recurring expenses
15. **Transaction tags** — Multi-label system alongside categories
16. **Split transactions** — Split a single transaction across categories
17. **Custom date range** — Date picker for reports and analytics
18. **Cash flow page** — Dedicated income vs expenses timeline

### Phase D — Dashboard & Reports (Week 5-6)
> These make the app visually impressive and personalized.

19. **Dashboard widget system** — Draggable, customizable widget layout
20. **Sankey diagram** — Interactive cash flow visualization
21. **Budget vs actual chart** — Visual comparison over time
22. **Net worth mini-chart on dashboard** — Sparkline in widget
23. **Goal forecast** — Projected completion date based on savings rate
24. **Saved reports** — Bookmark favorite report configurations
25. **Monthly review card** — AI-generated monthly summary

### Phase E — Advanced Features (Week 7-8)
> These differentiate FinBrain from basic trackers.

26. **Spending forecast** — ARIMA/Prophet 30/60/90 day projections
27. **Anomaly detection** — Flag unusual transactions automatically
28. **Investment portfolio view** — Holdings, allocation, performance tracking
29. **Budget alerts** — Push/email notifications at threshold percentages
30. **Payment reminders** — Notifications before bill due dates
31. **Transaction review queue** — Dedicated page for flagged items
32. **Bulk category reassignment** — Edit multiple transactions at once
33. **Duplicate detection** — Warn on import of potential duplicates

### Phase F — Polish & Delight (Ongoing)
> The details that make the app feel premium.

34. **Profile picture upload**
35. **Theme toggle (light/dark)**
36. **Import history log**
37. **Merchant management (rename/merge)**
38. **Connection management UI**
39. **Notification preferences**
40. **Flex budgeting mode**
41. **Tax-deductible tagging and report**
42. **Receipt attachment on transactions**
43. **Daily remaining budget calculation**

---

## QUALITY BENCHMARKS (Monarch's Standard)

### Interactions
- [x] Every modal has focus trap + Escape to close ✅
- [x] Every destructive action has undo (toast with timer) ✅
- [x] Every list has skeleton loader on initial load ✅
- [x] Every form has inline validation with clear error messages ✅
- [x] Every CRUD operation shows toast feedback ✅
- [x] Optimistic updates on all data mutations ✅
- [ ] Keyboard shortcuts: Cmd+K for search, Cmd+N for new transaction
- [x] Smooth page transitions (fade/slide) ✅

### Visual
- [x] Consistent glass-morphism design language ✅
- [x] All charts have tooltips with precise values ✅
- [x] All charts have aria-labels and role="img" ✅
- [x] Color-coded everything (categories, budgets, goals, recurring) ✅
- [x] Progress bars on all goal/budget cards ✅
- [x] Empty states with helpful CTAs (not blank screens) ✅
- [x] Responsive: works on mobile (320px) through desktop (2560px) ✅

### Data
- [x] All amounts respect user's currency preference ✅
- [x] All dates formatted per locale ✅
- [x] All lists have sort + filter + search ✅
- [x] All tables have pagination (or infinite scroll) ✅
- [x] All data has proper loading/error/empty states ✅
- [x] No hardcoded values — everything computed from real data ✅

---

## WHAT FINBRAIN ALREADY DOES WELL

Credit where it's due — these areas are solid or ahead of Monarch:

- **ML-powered categorization** — XLM-RoBERTa with 86.5% accuracy (Monarch uses basic ML)
- **User correction learning** — Corrections saved for retraining (Monarch doesn't have this)
- **German bank statement support** — PDF parser for European formats
- **Financial health score** — 0-100 score with weighted factors
- **Glass-morphism design** — Unique visual identity (Monarch is more generic)
- **Accessibility** — Focus traps, ARIA, keyboard navigation (Monarch's mobile lacks this)
- **Open source** — Self-hostable, no subscription fee
- **Multi-currency from day one** — 7 currencies with conversion
- **Soft delete with audit trail** — Enterprise-grade data safety
- **Instant UI feedback** — Optimistic updates + undo toasts on all CRUD ✅
- **Smooth navigation** — Page transitions between all routes ✅
- **Real-time notifications** — Bell with unread count + dropdown ✅

---

## Summary

| Category | FinBrain Score | Monarch Score | Gap Size | Notes |
|----------|---------------|---------------|----------|-------|
| Dashboard | 6/10 | 10/10 | MEDIUM | AI insights + chat + notification bell done |
| Transactions | 8/10 | 10/10 | SMALL | Optimistic + undo done |
| Budgets | 6/10 | 10/10 | MEDIUM | Optimistic create/edit done, need rollover |
| Goals | 7/10 | 9/10 | SMALL | Optimistic create/edit done |
| Accounts | 7/10 | 9/10 | SMALL | Edit + per-account transactions done |
| Reports | 5/10 | 10/10 | LARGE | Unchanged |
| Recurring | 4/10 | 9/10 | LARGE | Unchanged |
| Settings | 3/10 | 8/10 | LARGE | Unchanged |
| ML/AI | 7/10 | 8/10 | SMALL | Insights + chat wired |
| Quality/UX | 8/10 | 9/10 | SMALL | Skeletons, toasts, transitions, ARIA done |
| **Overall** | **6.5/10** | **9.3/10** | **MEDIUM** | Up from 5/10 |

The biggest remaining wins would be:
1. Rollover budgets (expected feature for any budget app)
2. Calendar view for recurring bills
3. Sankey diagram (most impressive visual feature)
4. Dashboard customization (high visual impact)
5. Spending forecast (ML differentiator)
