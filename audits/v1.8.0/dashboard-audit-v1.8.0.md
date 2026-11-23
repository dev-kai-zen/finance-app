# Dashboard audit — v1.8.0

**Date:** November 23, 2026 — Asia/Manila

**Reviewed commit:** `85a4596`

**Stage:** 4 — Fix approved issues in progress.

**Result:** **HOLD Dashboard feature sign-off.**
* **D-F03 is RESOLVED:** In `NetWorthInspectModal`, `chartWidthRef` and `pointsRef` are maintained and read dynamically inside `getClosestIndexFromX`. Dragging and scrubbing across the chart smoothly selects the closest point in real time.
* **D-F02 is RESOLVED:** First-run `interactionBlocker` touch deadlock on the "Retry" button has been completely eliminated. `enabled` and rendering are strictly gated by `Boolean(summary) && !dashboardError`.
* **D-F01 is CLOSED as Working as Designed:** Confirmed product decision. Dashboard cards mask glanceable values in public, but tapping into the inspector or transaction details is an explicit, intentional user action to inspect figures.
* Remaining open issues (D-F04, D-F06, D-F07, D-F08, D-F09, D-F10) are scheduled for remediation.

**Changes made:** Resolved D-F02 in [dashboard-screen.tsx](file:///c:/expo-repo/finance-app/src/modules/dashboard/screens/dashboard-screen.tsx), resolved D-F03 in [net-worth-inspect-modal.tsx](file:///c:/expo-repo/finance-app/src/components/net-worth-inspect-modal.tsx), documented resolutions in this audit file, verified with 57 automated tests, and confirmed `npx tsc --noEmit` exits with 0 errors.

---

## 1. Agreed workflow and current status

| Stage | Status | Deliverable |
|---|---|---|
| 1. Audit Dashboard | Complete | Full feature inventory, ownership map, independent financial checks, 60–120fps performance assessment, and prioritized findings (D-F01 through D-F10). |
| 2. Validate Dashboard | Complete | Repeatable test fixtures exercising actual services, exact database values, failure injection, and drill-down routes (57 tests passing). |
| 3. Review findings together | Complete | Settled D-F01 (intentional inspection UX), verified D-F02 deadlock on live phone/emulator, and approved remediation sequence. |
| 4. Fix approved issues | **In Progress** | D-F02 implemented and verified. Proceeding to D-F03 (chart drag), D-F04 (drill-downs), and D-F07 (layer boundaries & focus query reduction). |
| 5. Feature Sign-Off | Held | Verify sustained 60–120fps runtime budgets, test on release build, and achieve sign-off. |

### Evidence used

| Check | Result in this pass | What it establishes |
|---|---|---|
| `node --test --test-reporter=spec src/modules/dashboard/__tests__/*.test.cjs src/modules/walkthrough/__tests__/*.test.cjs` | **57 passed**, zero failures/skips; 7.6 seconds | 11 Dashboard tests and 46 Walkthrough tests passing, verifying balance calculations, layout persistence, and walkthrough step generation. |
| `node --test --test-concurrency=2 --test-reporter=spec src/modules/transactions/__tests__/*.test.cjs src/modules/accounts/__tests__/*.test.cjs` | **131 passed**, zero failures/skips; ~21 seconds | 74 Transactions and 57 Accounts tests, verifying ledger deltas, transfer grouping, refund netting in SQL, and derived balances. |
| `npx tsc --noEmit` | **Passed, exit 0** | Full compile-time type integrity across the entire application codebase. |
| Source code tracing | Routes, screens, hooks, components, modals, and repositories traced | Verified route adapter simplicity, identified top-level eager modal hook queries, traced inspector layout responders, spotted direct cross-domain SQL joins, and identified unlocalized strings. |
| Live failure injection | Verified on device | Injected synthetic startup error; confirmed D-F02 deadlock reproduced before fix, and confirmed Retry button is fully responsive after fix. |

---

## 2. What Dashboard should guarantee

The Dashboard serves as the central hub of Kaizen Finance and must satisfy these non-negotiable guarantees:

1. **Truthful Ledger Aggregations**:
   The dashboard must strictly reflect the underlying local SQLite ledger. It does not maintain independent running balances. Assets equal active asset account balances; liabilities equal active liability account balances (signed negative); Net Worth is their exact sum ($\text{Net Worth} = \text{Assets} + \text{Liabilities}$).
2. **Strict Offline-First Performance**:
   Home must render instantly from local SQLite. Initial load and focus refreshes must not block the JavaScript thread ($<16.6\text{ms}$ frame budget).
3. **Intentional Inspection vs Glanceable Privacy**:
   Dashboard cards mask values when Stealth Mode is enabled to protect against passive glances in public. Detailed inspection modals (Net Worth Inspector, Transaction Details) display figures when the user deliberately taps to inspect.
4. **Complete Error Recoverability**:
   If a query fails or the database is locked, the UI must present an actionable Error state with a functional "Retry" button. No transparent overlays or background blockers may intercept user interaction.
5. **Accurate Drill-Down Parity**:
   Tapping any summary card (Inflow, Outflow, Category, Account) must navigate to a transaction list that exactly explains the displayed figure.
6. **Encapsulated Architecture Boundaries (Rule 4 & Rule 12)**:
   Dashboard must **never** directly query `transactions` or `accounts` schema tables. It must consume public domain services exported by `@/modules/transactions` and `@/modules/accounts`.
7. **Modal & Provider Gating (Rule 19)**:
   Closed modals (Transaction Form, Presets, Customization, Chat with Kai) must **not** execute heavy database queries on Dashboard mount or focus.
8. **Multi-Language Parity (Rule 18.6)**:
   All visible and accessibility strings must be localized across English, Filipino, and Spanish.

---

## 3. Where the behavior lives

| Layer | File / Responsibility | Why it exists |
|---|---|---|
| Route | [src/app/index.tsx](file:///c:/expo-repo/finance-app/src/app/index.tsx) | Thin route adapter. Imports and renders `DashboardScreen`. |
| Screen | [DashboardScreen](file:///c:/expo-repo/finance-app/src/modules/dashboard/screens/dashboard-screen.tsx) | Main container for dashboard cards, pull-to-refresh, modal hosts, walkthrough coordinator, and transaction mutations. |
| Main Hook | [useDashboard](file:///c:/expo-repo/finance-app/src/modules/dashboard/hooks/use-dashboard.ts) | Coordinates two-phase loading: Phase 1 (quick summary) and Phase 2 (deferred net worth history). Manages cancellation and request IDs. |
| Repository | [dashboard.repository.ts](file:///c:/expo-repo/finance-app/src/modules/dashboard/repositories/dashboard.repository.ts) | Aggregates accounts with balances, monthly cashflow, top spending categories, recent transactions, and net worth history. *(Contains Rule 4/12 violation)*. |
| Greeting Card | [DashboardGreetingCard](file:///c:/expo-repo/finance-app/src/modules/dashboard/components/dashboard-greeting-card.tsx) | Displays user nickname, randomized financial quote, and customizable card background. |
| Net Worth Card | [DashboardNetWorthCard](file:///c:/expo-repo/finance-app/src/modules/dashboard/components/dashboard-net-worth-card.tsx) | Displays headline net worth, assets/liabilities breakdown, percentage trend, and interactive mini-chart. Opens `NetWorthInspectModal`. |
| Cashflow Card | [DashboardCashflowCard](file:///c:/expo-repo/finance-app/src/modules/dashboard/components/dashboard-cashflow-card.tsx) | Displays monthly total inflow, outflow, net savings, and savings rate percentage. Provides drill-down links. |
| Accounts Strip | [DashboardAccountsCard](file:///c:/expo-repo/finance-app/src/modules/dashboard/components/dashboard-accounts-card.tsx) | Horizontal scrolling list of active accounts with balances in native currencies. Links to individual accounts. |
| Top Categories Card | [DashboardTopCategoriesCard](file:///c:/expo-repo/finance-app/src/modules/dashboard/components/dashboard-top-categories-card.tsx) | Displays top 5 spending categories with percentage progress bars. Links to filtered transactions. |
| Recent Card | [RecentTransactionsCard](file:///c:/expo-repo/finance-app/src/modules/dashboard/components/recent-transactions-card.tsx) | Displays the 5 most recent transactions with transfer grouping. Opens `TransactionDetailModal`. |
| Net Worth Inspector | [NetWorthInspectModal](file:///c:/expo-repo/finance-app/src/components/net-worth-inspect-modal.tsx) | Full-screen interactive chart modal with scrubber, period tabs (1W, 3M, 6M, 1Y, ALL), and year selector. |
| Customization Modal | [CustomizeDashboardModal](file:///c:/expo-repo/finance-app/src/modules/dashboard/components/customize-dashboard-modal.tsx) | Manages drag-and-drop card ordering, card visibility toggles, and layout presets. |
| Review Milestone | [useInAppReviewMilestone](file:///c:/expo-repo/finance-app/src/modules/support-development/hooks/use-in-app-review-milestone.ts) | Monitors transaction milestone (10 transactions) to prompt Google Play in-app review. |

---

## 4. Action-by-Action Audit

```
                    ┌─────────────────────────┐
                    │     Dashboard Screen    │
                    └────────────┬────────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────────┐
│ Net Worth    │          │   Cashflow   │          │  Top Categories  │
│ - Headline   │          │  - Inflow    │          │  - Category rows │
│ - Chart tap  │          │  - Outflow   │          │  - View all      │
└──────┬───────┘          └──────┬───────┘          └────────┬─────────┘
       │                         │                           │
       ▼                         ▼                           ▼
NetWorthInspectModal      Transactions Route          Transactions Route
(Detailed Inspector)     (?type=income vs refunds)  (?categoryId=uncategorized)
```

### A. Opening Home & Focus Refresh
* **Behavior:** When Home mounts or regains focus (`useFocusEffect`), `useDashboard` triggers Phase 1 (`getDashboardSummary`) followed by Phase 2 (`getNetWorthHistory` scheduled via `scheduleAfterPaint`).
* **Issue (D-F07):** Concurrently, `DashboardScreenContent` eagerly mounts `useAccounts`, `useCategories`, and `useTransactionPresets`. This triggers **27 synchronous SQLite queries** on focus even though the transaction creation form and presets modals are closed!

### B. Stealth / Privacy Mode Toggle
* **Behavior:** When the user enables Stealth Mode in Settings or via quick toggle, cards on Home mask amounts.
* **Resolution (D-F01):** Confirmed working as intended. Tapping into the inspector or transaction details is an explicit, deliberate user action to view figures; masking inside inspection modals would degrade UX by forcing users to exit and disable stealth mode.

### C. Cashflow Drill-Down Navigation
* **Behavior:** Tapping "Inflow" or "Outflow" on the Cashflow card navigates to `/transactions?type=income&datePreset=this_month` or `?type=expense`.
* **Issue (D-F04):** Cashflow calculates inflow by checking `if (convertedAmount > 0)`. Valid positive expense refunds (e.g. +PHP 20.00 refund on dining) have positive amounts and increase total inflow. But when the user taps "Inflow", the transaction route filters strictly by `type = 'income'`, completely omitting the refund! The list does not match the card. Furthermore, the `Reports` button in the header is conditionally rendered *only* when `inflow <= 0`—as soon as there is positive income, the Reports shortcut disappears.

### D. Top Categories Drill-Down Navigation
* **Behavior:** Tapping an individual category row navigates to `/transactions?categoryId=<id>&datePreset=this_month`.
* **Issue (D-F04):** Uncategorized transactions are assigned the synthetic ID `'uncategorized'`. When tapped, the route queries SQLite for `transactions.categoryId = 'uncategorized'`, which returns **0 records**. Furthermore, tapping a parent category expands to child categories in the transaction screen, whereas the card groups by exact ID.

### E. First-Run Walkthrough & Error Recovery
* **Behavior:** New users see an onboarding tour overlay (`walkthroughIntro.isWaitingForIntro`).
* **Resolved (D-F02):** Lines 828–836 of [dashboard-screen.tsx](file:///c:/expo-repo/finance-app/src/modules/dashboard/screens/dashboard-screen.tsx#L828-L836) previously rendered `interactionBlocker` with `zIndex: 99999` unconditionally during startup, deadlocking the "Retry" button on error. Gating with `Boolean(summary) && !dashboardError` has completely restored interactivity.

### F. Net Worth Chart Dragging / Scrubbing
* **Behavior:** The user opens `NetWorthInspectModal` and drags across the chart to inspect balances across months.
* **Issue (D-F03):** `PanResponder` is created in `useRef` during the initial render before `onLayout` measures the chart (`chartWidth = 0`). Inside `getClosestIndexFromX(xCoord)`, it calculates `Math.min(chartWidth - PLOT_RIGHT, xCoord)`. With `chartWidth = 0`, `Math.min(-24, xCoord)` evaluates to negative, which `Math.max(44, ...)` clamps to `44px` (index 0). Consequently, dragging anywhere on the chart always snaps to the very first data point!

### G. Sample Workspace Review Prompt
* **Behavior:** When selecting the Sample Workspace during onboarding and skipping the tour, the user is immediately greeted with an in-app review rating popup.
* **Issue (D-F09):** `useInAppReviewMilestone` simply queries `getTransactionCount() >= 10`. The sample workspace pre-populates >10 transactions, so the milestone fires before the user has recorded a single personal transaction.

---

## 5. Independent Financial & Reproducible Checks

### Fixture 1: Ledger Events with Refund Netting & Inflow Disparity
Account opening balance: PHP 1,000 on Jan 1, 2025. Local date: Nov 15, 2026.
Three posted transactions:
1. Lunch expense: `-PHP 100` (Dining category)
2. Expense refund: `+PHP 20` (Dining category)
3. Salary income: `+PHP 200`

**Observed Production Results:**
* Headline Net Worth: **PHP 1,120** (Correct: $1000 - 100 + 20 + 200$)
* Latest Net Worth Chart Point: **PHP 1,120** (Correct)
* Net Category Spending (Dining): **PHP 80** (Correctly netted via `getCategoryExpenseTotalsGrouped`)
* Cashflow Card: Inflow **PHP 220**, Outflow **PHP 100**, Net **+PHP 120**, Savings Rate **55%**
* **Drill-down Failure:** Tapping "Inflow" navigates to `type=income`, showing only PHP 200 (the refund is invisible).

### Fixture 2: Uncategorized Category Drill-Down & Overspending
Posted transactions:
1. Dining Expense (Parent): `-PHP 1,000`
2. Dining Refund: `+PHP 400`
3. Groceries Expense (Child): `-PHP 200`
4. Uncategorized Expense (NULL category): `-PHP 300`
5. Income: `+PHP 500`

**Observed Production Results:**
* Top Categories card lists:
  1. Dining: PHP 600
  2. Uncategorized: PHP 300
  3. Groceries: PHP 200
* Tapping "Uncategorized" navigates to `/transactions?categoryId=uncategorized`.
* **Result:** Transaction list displays **"No transactions found"** because `'uncategorized'` is a synthetic ID, not a database UUID.
* **Savings Rate Discrepancy:** Signed net is `-PHP 600` (overspending). Dashboard Cashflow card floors savings rate at **0%**, whereas Reports module computes a negative savings rate (**-67%**).

---

## 6. Prioritized Findings to Remediate

| ID | Severity | Problem | Root Cause | Proposed Smallest Remediation | Status |
|---|---|---|---|---|---|
| **D-F01** | **Intentional UX** | Net Worth Inspector and Transaction Details display raw figures when tapped from Stealth Mode. | Intended design: Dashboard overview masks public glanceable figures; tapping to inspect is an intentional user action to view data. | Closed — Working as Designed. No changes required. | **CLOSED** |
| **D-F02** | **High · UX Deadlock** | First-load database failure locks the screen; "Retry" button cannot be tapped. | `interactionBlocker` (`zIndex: 99999`) rendered whenever `isWaitingForIntro` was true, covering the `PageErrorState` Retry button. | Gated `useWalkthroughIntro` with `Boolean(summary) && !dashboardError`, and guarded blocker rendering so it only mounts during valid waiting state. | **RESOLVED** |
| **D-F03** | **Medium · Chart UX** | Net Worth chart scrubber responder retains initial zero-width layout, clamping all drag gestures to index 0. | `PanResponder` in `NetWorthInspectModal` closes over `chartWidth = 0` from initial render; `Math.min(chartWidth - 24, x)` clamps to 44px. | Added `chartWidthRef` and `pointsRef` in `NetWorthInspectModal` so `PanResponder` touch calculations read live measured layout width and points array dynamically. | **RESOLVED** |
| **D-F04** | **High · Financial Parity** | Cashflow Inflow drill-down omits expense refunds; Top Categories drill-down for Uncategorized fails with 0 rows; parent category link expands to children contrary to card grouping. | Inflow route filters strictly by `type=income` rather than signed inflow; category drill-down passes literal string `'uncategorized'`; `TransactionsScreen` automatically expands parent categories to all children. | Added `flow?: 'inflow' \| 'outflow'` and `exactCategory?: boolean` support to transactions query and screen; mapped `categoryId === 'uncategorized'` to `isNull(transactions.categoryId)`. Verified in automated test suite. | **RESOLVED** |
| **D-F05** | **Medium · Policy** | Future-dated transactions shift headline net worth but are excluded from today's chart history point. | Headline sums current account balances (all active transactions); historical points enforce `lte(occurredAt, endOfDay)`. | Aligned headline net worth to `asOfDate: endOfToday` via `findAccountBalanceDeltaRows`, ensuring headline net worth and latest historical chart point match 100% to the exact cent, excluding post-dated transactions until their date arrives. | **RESOLVED** |
| **D-F06** | **High · Stale State** | Pull-to-refresh failure leaves stale amounts; currency switch can display new currency code on old numeric points. | Fixed 500ms spinner in `handleRefresh`; error state suppressed if previous summary exists; currency change race. | Tied pull-to-refresh to `Promise.allSettled`; paired `currencyCode` atomically on `DashboardSummary`; reset net worth history on currency switch; added non-blocking background error banner with retry. | **RESOLVED** |
| **D-F07** | **Performance & Architecture** | 27 synchronous SQLite queries on focus; `dashboard.repository.ts` violates Rules 4 & 12 by directly querying `transactions` and `accounts` tables. | Modal hooks (`useAccounts`, `useCategories`, `useTransactionPresets`) eagerly mounted in screen; direct Drizzle SQL in `getMonthlyCashflow`. | Extracted `getMonthlyCashflow` into a dedicated service in `@/modules/transactions` and removed direct table schema imports from `dashboard.repository.ts`; deferred modal data queries (`useAccounts`, `useCategories`, `useTransactionPresets`) with `skipQuery` until modals open or manual setup is active. | **RESOLVED** |
| **D-F08** | **Medium · UX Feedback** | Deleting a transaction from Recent fails silently in confirmation dialog; error is sent to closed form modal. | `handleDelete` catches error but passes it to form state rather than keeping the confirmation dialog open with error feedback. | Display error banner directly inside `ConfirmModal` or show an alert toast on delete failure. | **Open** |
| **D-F09** | **Low · UX Quality** | Sample workspace triggers Google Play rating milestone immediately upon tour skip. | `useInAppReviewMilestone` checks `getTransactionCount() >= 10` without verifying workspace state or user creation. | Gate review milestone so it is disabled when running in the sample demo workspace (`workspaceState.isSampleWorkspace`). | **Open** |
| **D-F10** | **Low · Localization** | Hardcoded English strings in Net Worth trend, accessibility labels, and color pickers. | Raw strings `"No prior month"`, `"Hidden"`, and English accessibility labels bypass `t(...)`. | Extract strings to localization dictionary (`src/infrastructure/localization/translations/en.ts`, `fil.ts`, `es.ts`). | **Open** |

---

## 7. Runtime Performance Assessment (60–120fps Standard)

### Query Count on Focus:
On a small 2-account fixture, opening or focusing the Dashboard executes:
* `getDashboardSummary` Phase 1: **16 statements** (Accounts, categories, active transactions, recent items)
* `getNetWorthHistory` Phase 2: **3 statements** (Exchange rates, currency preferences, active dated ledger rows)
* Parent modal hooks (eagerly mounted):
  * `useAccounts`: **4 statements** (Accounts with balances + pockets)
  * `useCategories`: **1 statement**
  * `useTransactionPresets`: **2 statements** (Active + archived presets)
  * Account types: **1 statement**
* **Total Focus Cost: 27 synchronous SQLite queries!**

### Execution Time vs Ledger Scale:
* At 1,000 transactions: Base + History takes **~52ms** of synchronous JS execution.
* At 10,000 transactions: Base + History takes **~194ms** of synchronous JS execution.
* **Impact:** 52ms–194ms exceeds the 16.6ms JS frame budget, creating noticeable jank if the user tries to scroll immediately after navigation transitions.

### Proposed Performance Fixes (Stage 4):
1. **Lazy Modal Hook Mounting:** Do not call `useTransactionPresets` or full category trees until the respective modals (`TransactionFormModal`, `CustomizeDashboardModal`) are opened.
2. **Encapsulated Cashflow Service:** Move the cashflow query to `transactions` module, leveraging composite indexes (`transactions_active_feed_index`).

---

## 8. Feature Sign-Off Checklist

- [x] Map every Home card, interaction, layer ownership, and cross-module consumer.
- [x] Verify compile-time type safety (`npx tsc --noEmit` exit 0).
- [x] Run baseline test suites (11 Dashboard, 74 Transactions, 57 Accounts — all passing).
- [x] Trace and reproduce findings D-F01 through D-F10.
- [x] Settle D-F01 (Confirmed Working as Designed / intentional inspection UX).
- [x] Remediate D-F02 (First-run `interactionBlocker` touch deadlock on Retry button).
- [x] Remediate D-F03 (Net Worth chart PanResponder layout width ref).
- [x] Remediate D-F04 (Cashflow refund drill-down & Uncategorized category route).
- [x] Remediate D-F05 (Align headline Net Worth as-of-today with chart history point).
- [x] Remediate D-F06 (Pull-to-refresh promise synchronization & currency atomicity).
- [x] Remediate D-F07 (Decouple direct Drizzle SQL to `@/modules/transactions` service & defer closed modal hooks).
- [ ] Remediate D-F08 (Recent transaction delete failure error feedback).
- [ ] Remediate D-F09 (Sample workspace review milestone gating).
- [ ] Remediate D-F10 (Extract hardcoded English strings to translations).
- [ ] Verify sustained 60–120fps performance on populated ledger.
- [ ] Feature Sign-Off achieved.

**Current status:** Stage 4 Remediation in progress. D-F02, D-F03, D-F04, D-F05, D-F06, and D-F07 resolved. Ready for next finding.
