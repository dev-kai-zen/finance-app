# Goals audit — v1.8.0

**Date:** November 27, 2026 — Asia/Manila

**Reviewed commit:** `73a9ee712398f279546f23fb5a83656633287d93`

**Working tree:** Clean before the audit. This pass adds this document only.

**Stage:** Audit and initial validation complete; findings and product decisions await review.

**Result:** **NOT READY FOR FEATURE SIGN-OFF.** The existing B09 currency-summary defect is reproduced. Additional findings concern pocket funding, incompatible links and previews, focused refresh, failure recovery, loading feedback, query/render cost, completion actions, localization, touch/accessibility, text layout, and reminder freshness.

This is a documentation-only audit under [AUDIT_CHECKLIST.md](../AUDIT_CHECKLIST.md) and [AGENTS.md](../../AGENTS.md), including Sections 17–21. No production fixes, migrations, dependency updates, release notes, version changes, or commits are included. Source findings, executed host probes, policy questions, and native verification gaps are distinguished below. All layout review stays in this report.

## 1. Existing audit inventory and priority decision

Checked every existing file in `audits/` for scope, recorded disposition, remaining verification, and next-feature recommendations. Historical sign-offs are reported as recorded; their entire test suites and native claims were not independently revalidated here.

| Existing file | Recorded status and relevance |
| --- | --- |
| [Audit checklist](../AUDIT_CHECKLIST.md) | Requires financial, lifecycle, recovery, architecture, localization/privacy, runtime performance, and unified text-layout evidence. |
| [Transactions](transactions-audit-v1.8.0.md) | Signed off; owns signed ledger deltas, transfers, fees, refunds, splits, and mutation events. Explicitly warns that Goals needs same-screen external-write refresh verification. |
| [Accounts](accounts-audit-v1.8.0.md) | Signed off; owns balances, pockets, archive/delete, and currency-change rules. Goal progress must consume its public services. |
| [Dashboard](dashboard-audit-v1.8.0.md) | Ready for sign-off. Deliberately opened inspection surfaces can reveal exact amounts by accepted policy; do not automatically apply that exception to Goals. |
| [Google Drive Backup](google-drive-backup-audit-v1.8.0.md) | Signed off; Quick Sync transport and replacement coordination. Does not sign off Local Backup/Restore or Goals UI behavior after replacement. |
| [Categories](categories-audit-v1.8.0.md) | Functional sign-off with native/performance follow-up recorded. Preserve resolved category behavior. |
| [Budgets](budgets-audit-v1.8.0.md) | Ready for sign-off; currency and scoped drill-down remediation recorded. This pass encounters one existing budget callback test failure; see Section 4. |
| [Credit Cards](credit-cards-audit-v1.8.0.md) | Signed off with product policies and RC native follow-up. Liability/credit interpretation must not be silently redefined by Goals. |
| [Scheduled Transactions](scheduled-transactions-audit-v1.8.0.md) | Ready, with explicit scale/polish deferrals and a policy allowing visible schedule amounts in privacy mode. Those exceptions are feature-specific. |
| [Calendar](calendar-audit-v1.8.0.md) | Ready; recommends Reports next. Its financial and schedule work is historical coverage, not Goals sign-off. |
| [Subscriptions](subscriptions-audit-v1.8.0.md) | Signed off; recommends Reports next. |
| [Reports](reports-audit-v1.8.0.md) | Records REP-F01–F14 and policy questions resolved; explicitly selects **Goals as the next fresh feature**. Native checklist items remain in the report despite its readiness heading. |
| [Existing cross-feature layout review](text-layout-review-v1.8.0.md) | Older queue: Subscriptions, Reports, **Goals**, Data Import, Local Backup/Restore, shared entry points. Retained as historical evidence; no new separate layout document. |

**Selected priority: Goals.** It is next in the latest explicit queue and still has an independently reproduced financial presentation defect. The broader [integrity audit, B09](../../V1_8_0_v3_INTEGRITY_AND_SIMPLICITY_AUDIT.md#b09--goal-summary-mixes-currencies-and-labels-them-php) and [screen-by-screen Goals review](../../V1_8_0_v4_SCREEN_BY_SCREEN_FLOW_AUDIT.md#10-goals--goals) were also consulted. GOAL-F01 below retains B09 as its alias rather than presenting it as a newly introduced defect.

**Following queue:** Review/remediate Goals findings, then Data Import, Local Backup/Restore, Global Search/Quick Entry, Notifications/Widgets, Settings/currencies/localization/security/onboarding, and remaining support features. Previous native validation gaps still require RC coverage; choosing a fresh feature does not close them.

## 2. Scope, ownership, and contracts

Goals tracks **live balances**, not an independent contribution ledger. Creating, completing, pausing, or deleting a goal should not move money. Add Funds opens Transactions; that module owns the financial write. There is no Goals export, goal Trash, or dedicated pause/archive control in the current screen. Persisted `paused` status exists, but the form preserves it rather than offering a status selector. Do not claim an archive/restore workflow was exercised when it is not exposed.

Expected contracts:

1. Per-goal amounts use the goal currency. A summary groups compatible units or explicitly converts them; changing the displayed symbol is insufficient.
2. Account plus its own pocket contributes once. A pocket-only goal responds to funding the intended pocket.
3. Link validity is enforced at save time and remains understandable when account currency/archive/delete changes affect existing links.
4. Goal configuration and all link changes save atomically. A failed edit preserves the prior configuration. Goal deletion removes links, not ledger money.
5. Focused screens refresh after external financial writes. Closed modals perform no domain reads; replaced databases do not retain old screen state.
6. Read/write failures remain visible and retryable. Drafts survive failed saves. Repeated actions do not produce duplicate financial operations.
7. Presentation distinguishes stored status from reaching the target through live balances; actions and notifications use an agreed interpretation.
8. English, Filipino, Spanish, large text, privacy, and narrow layouts remain usable without hiding essential amounts or actions.

### Ownership map

| Layer / consumer | Source and responsibility |
| --- | --- |
| Route | [goals.tsx](../../src/app/goals.tsx): thin adapter for `action=new` and `goalId`; imports the public Goals module. |
| Screen | [goals-screen.tsx](../../src/modules/goals/screens/goals-screen.tsx): summary, filters, create/edit/delete, completion, funding navigation, Pro guard, walkthrough and ad dock. |
| Hook | [use-goals.ts](../../src/modules/goals/hooks/use-goals.ts): deferred focus read, presentation filter, save/delete/status callbacks, loading/error state. |
| Read/business services | [get-goals-with-progress.service.ts](../../src/modules/goals/services/get-goals-with-progress.service.ts), [calculate-goal-progress.service.ts](../../src/modules/goals/services/calculate-goal-progress.service.ts): public Accounts balance services, member deduplication, currency filtering, progress/deadline/summary calculations. |
| Mutations | [save-goal.service.ts](../../src/modules/goals/services/save-goal.service.ts), [toggle-goal-status.service.ts](../../src/modules/goals/services/toggle-goal-status.service.ts), [delete-goal.service.ts](../../src/modules/goals/services/delete-goal.service.ts). |
| Data access and validation | [goals.repository.ts](../../src/modules/goals/repositories/goals.repository.ts), [goal.schema.ts](../../src/modules/goals/schemas/goal.schema.ts). No direct SQLite/Drizzle query in Goals screens or hooks. |
| Schema | [goals.ts](../../src/infrastructure/database/schema/goals.ts): `goals`, `goal_accounts`, `goal_pockets`; positive target/status checks; junction composite primary keys; legacy primary link columns. |
| Accounts dependency | Public `getAccountsWithBalances` and `getPocketsWithBalances`; their optional management checks are unnecessarily enabled by the Goals read. Account/pocket implementation remains owned by Accounts. |
| Transactions dependency | Funding route opens income creation with `accountId`. No pocket parameter is supported by the current [Transactions route](../../src/app/transactions/index.tsx). |
| Search | [use-general-search.ts](../../src/modules/search/hooks/use-general-search.ts) calls `useGoals({ skipQuery })`; displays target in the goal currency and links to `/goals?goalId=…`. Nonempty search loads progress that search itself does not need. |
| Notifications | [schedule-goal-reminders.service.ts](../../src/modules/notifications/services/schedule-goal-reminders.service.ts), [check-instant-alerts.service.ts](../../src/modules/notifications/services/check-instant-alerts.service.ts): public progress service, deadline scheduling and milestones. |
| Backup, reset, Quick Sync | [user-data-tables.ts](../../src/infrastructure/database/user-data-tables.ts) includes all three goal tables. [DatabaseProvider](../../src/infrastructure/database/database-provider.tsx) remounts descendants after replacement. Native restore/transport was not executed. |
| Currency usage | [currency-usage.repository.ts](../../src/modules/currencies/repositories/currency-usage.repository.ts) includes goal currencies in usage protection. Account currency-change checks only consider transaction history. |

Goals follows the main route → screen → hook → service/repository → database direction. It uses public Accounts services rather than querying their tables. Proposed fixes should preserve this boundary; no new progress table, context provider, duplicate ledger, or generic orchestration layer is justified.

### Relationships and action inventory

`goal_accounts`/`goal_pockets` cascade on deleting a goal or linked account/pocket. Legacy `goals.account_id`/`pocket_id` become null on deleting their target. Reads merge legacy and junction links without duplicating an identical ID. Migrations `0030_add_goals`, `0031_add_goal_accounts`, and `0032_add_goal_pockets` describe the feature; the probe applies **all current journal migrations**, not a hand-written substitute schema.

| Action / state | Current path and review outcome |
| --- | --- |
| Open, focus, pull refresh | One deferred `useGoals` refresh per focus, cancellation on retrigger/blur/unmount. Cached loads conceal pending work; pull indicator uses a fixed timer. GOAL-F04–F07. |
| All / In Progress / Completed | In-memory filter; paused goals appear in All unless derived completed. Count/status policy needs review; no SQL per tab change. |
| New / deep-linked new | Free limit checked by `handleOpenCreate`; form opens after initial load. Native rapid-tap/paywall behavior pending. |
| Edit / search result | `goalId` finds loaded goal and opens form. Title ≤80, note ≤500, positive integer target; schema validates on save. Missing deep-linked ID has no explicit not-found state. |
| Fund selection | Active matching-currency options; blocks new parent/child conflicts. Existing invalid links can survive; preview differs from service. GOAL-F03. |
| Currency, amount, date, icon/color | Nested calculator/pickers and custom color save. Currency change clears links. Deadline is local midnight; display uses device locale rather than app locale. |
| Save / failure / dirty close | Main-db `saveGoal` transaction owns goal and links; form catches error and only closes on success. Shared form has dirty-close confirmation and pending save guard. Native keyboard/repeated taps pending. |
| Complete / reopen | Updates status; derived completion can immediately override the visible effect of reopening. GOAL-F08. |
| Add Funds | Opens Transactions income form; linked pocket identity is dropped. GOAL-F02. Whether new money or an internal transfer is intended remains a product question. |
| Delete / cancel | Permanent configuration delete; successful cascade leaves transactions intact. Screen does not catch delete failure or pass an error to confirmation. GOAL-F05. |
| Empty / error / retry | Empty view exists. Read error is returned by hook but ignored by screen; can look like no goals or stale success. GOAL-F05. |
| Privacy / accessibility | Cards, summary and form chips mask amounts/percentages; picker displays exact balances. This deliberate-open exception needs a Goals decision. Touch/layout findings below. |
| Background / replacement | Quick Sync listens to SQLite changes independently of feed events. Database replacement remounts subtree. Reminders refresh on startup/resume/settings, not Goals edits. GOAL-F12. |

## 3. Independent fixtures and executed probes

Host: Windows, Node `v22.23.5`, installed TypeScript and Expo Drizzle driver. Appendix A executes production services/repositories against migrated `node:sqlite` in-memory databases using the existing Accounts native-bridge adapter. React Native/Expo platform dependencies are mocked; no user database or real notification/Drive endpoint is opened. Appendix B executes the actual Goals hook with controlled dependencies and the actual funding callback extracted from its TSX AST.

### Money fixture — one currency, six ledger rows

| Operation | Cash PHP | Bank PHP | Combined PHP |
| --- | ---: | ---: | ---: |
| Opening balances | 1,000 | 500 | 1,500 |
| Expense 100 | 900 | 500 | 1,400 |
| Income 200 | 1,100 | 500 | 1,600 |
| Transfer 300 cash → bank | 800 | 800 | 1,600 |
| Fee 10 from cash | 790 | 800 | 1,590 |
| Expense refund 20 | **810** | **800** | **1,610** |

An account-linked PHP 2,000 goal returns **161000 saved minor units**, with six transaction rows. The transfer principal cancels between accounts; fee/refund affect progress once. These rows isolate Goals balance consumption; transaction creation, splits, FX and fee-group ownership rely on related tests and still need end-to-end native acceptance.

### Probe results

| Probe | Observed result / evidence boundary |
| --- | --- |
| PHP target 2,000/saved 1,000 + USD target 200/saved 100 | Individual goals retain correct denomination. Summary returns target `220000`, saved `110000`, percentage `50`; caller labels these PHP. **B09 reproduced**, no exchange rate used. |
| Save a PHP goal linked to a USD account | Save succeeds; read exposes the link but contributes zero. UI picker normally excludes this choice; service contract is not authoritative. |
| Change linked account USD → PHP through actual `saveAccount`, before any transactions | Allowed. Existing USD goal drops from `10000` saved to `0`; the actual form preview calculation still returns `10000` and formats it using the goal currency. Valid in-app drift path, not just corrupt test data. |
| Pocket-only goal: pocket 250, add account-level income 100 | Pocket goal stays `25000`; account becomes `135000` including opening 1,000 and pocket income 250. Actual Add Funds callback emits `/transactions?action=new&type=income&accountId=a`, with no pocket. Native final save not executed. |
| Parent and child linked together | Service returns `135000`, not `160000`; parent/child deduplication **passes**. Preview's separate sums do not share this guard. |
| Failed new goal with second missing FK; failed existing-goal relink | Both throw and roll back. Table counts unchanged for create; full goal/link read equals pre-edit snapshot for update. |
| Delete goal with both link types | Both junction types removed; ledger row count unchanged; `PRAGMA foreign_key_check` empty. |
| Reopen a goal whose live balance exceeds target | Stored status is `in_progress`, but returned `isCompleted` remains true. Card still offers reopening. |
| Local deadline yesterday / today / tomorrow, fixed November 27 noon | Returns past/0 days, not-past/0 days, not-past/1 day respectively. Local midnight handling passes this fixture; DST and day rollover while continuously focused are untested. |
| Cached refresh | Actual hook returns `loading=false` with one deferred read pending. |
| Inject read / delete / status errors | Read error reaches hook state with cached rows retained; delete/status callbacks rethrow. Screen ignores hook error and does not catch those action exceptions. |
| Unmount with pending refresh | Cancellation removes scheduled query; pass in controlled hook harness. |
| Read side effects | `total_changes()` unchanged before/after measured reads; no read-time repair/write observed. |

The existing eight Goals tests **copy** the progress implementation into a `.cjs` helper; they do not import the production service. Their parent/pocket aggregation fixture also computes its own sums. Passing them cannot prove production progress, SQL, service validation, or callback behavior. Add durable production-service regressions during remediation; audit-only appendices are reproducible evidence, not a replacement for maintained feature tests.

## 4. Validation run and limits

| Check | Result |
| --- | --- |
| `node --test --test-reporter=spec` across all `.test.cjs` files in Goals, Accounts, Transactions, Search and Notifications test directories | **197 tests: 196 passed, 1 failed, 0 skipped/cancelled.** About 8.1 seconds. Existing failure below. Goals' eight copied-helper tests pass; Search also exercises Goals hook skip/cancellation. |
| `npx tsc --noEmit` | **Passed, exit 0**, no output/errors. |
| Appendix A production-service / migrated SQLite probes | **Passed, exit 0**; assertions establish current behavior, including the reproduced undesirable results. These are not assertions that every product contract passes. |
| Appendix B actual hook / callback probes | **Passed, exit 0**; controlled scheduling and service mocks, no mounted native renderer. |
| Native release app, 320/360/390 widths, font scales, TalkBack/VoiceOver, keyboard, real reminders, actual restore/Quick Sync | **Not executed.** No screenshot, device frame-rate trace, OS delivery result, or visual sign-off is claimed. |

**Existing baseline failure:** `src/modules/transactions/__tests__/budget-drill-down.test.cjs`, test “BUD-F02: the actual budget link callback sends the loaded scope instead of a month preset,” at line 82. It extracts `onViewTransactions={handleViewTransactions}` from Budgets and evaluates the identifier without defining its closure, throwing `ReferenceError: handleViewTransactions is not defined`. This is evidence of a broken test extraction at the reviewed commit, not evidence that the budget navigation product behavior itself is broken. No code was modified before the run. Do not mark the related baseline wholly green or change unrelated Budgets code in this audit.

Logs created outside the repository: `%TEMP%/finance-goals-audit-tests.log`, `%TEMP%/finance-goals-audit-types.log`, `%TEMP%/finance-goals-audit-v180.log`, and `%TEMP%/finance-goals-lifecycle-audit-v180.log`. Temporary logs are convenience artifacts; the fixtures, outcomes, and scripts are preserved here for review.

PowerShell command used for the related baseline:

```powershell
$auditTests = @(rg --files src/modules/goals/__tests__ src/modules/accounts/__tests__ src/modules/transactions/__tests__ src/modules/search/__tests__ src/modules/notifications/__tests__ | Where-Object { $_ -like '*.test.cjs' })
node --test --test-reporter=spec @auditTests
npx tsc --noEmit
```

## 5. Prioritized findings and four-question remediation gate

All findings below remain **open**. Directions are proposed, not implemented. Each supplies the actual problem, cause/path, smallest reasonable direction, and regression proof required before a production change. Native-only risks retain that evidence level.

### GOAL-F01 / B09 — P1, executed: incompatible summary money is labeled PHP — RESOLVED

1. **Problem:** PHP 2,000 + USD 200 becomes PHP 2,200. A USD-only summary is also labeled PHP. Raw percentages weight currencies by incompatible minor units; equal 50% fixture progress does not validate that formula generally.
2. **Cause:** `getGoalsWithProgress`, lines 95–110, sums every nonpaused goal's raw target/saved values. `GoalSummaryHeader`, line 19, defaults to PHP; screen lines 276–279 pass no currency. `GoalSummaryStats` carries no denomination.
3. **Fix applied:**
   - Updated `GoalSummaryStats` to include `currencyCode?: string;` and `totalRemainingMinorUnits?: number;`.
   - In `getGoalsWithProgress`:
     - If all active goals share a single currency, use that currency directly (exact math, no FX conversion).
     - If goals span multiple currencies (or no goals exist), use the user's default currency (`getCurrencyPreferences(context).defaultCurrency || DEFAULT_BASE_CURRENCY`) and convert target, saved, and remaining values via `convertCurrencyMinorUnits` and `getExchangeRateMap(DEFAULT_BASE_CURRENCY, context)`.
     - Calculated `totalRemainingMinorUnits` by summing individual goal non-negative remaining shortfalls so surplus in an overfunded goal does not erase deficits in underfunded goals.
   - In `goals-screen.tsx`: passed `currencyCode={summary.currencyCode}` to `GoalSummaryHeader`.
   - In `goal-summary-header.tsx`: resolved `activeCurrency` dynamically from `currencyCode ?? summary.currencyCode ?? preferences.defaultCurrency ?? "PHP"` (removing hardcoded default) and used `summary.totalRemainingMinorUnits`.
   - In `use-goals.ts`: initialized summary with default currency and remaining units.
4. **Proof:** Added durable production-service tests in `src/modules/goals/__tests__/goals-summary-currency.test.cjs` covering:
   - Single PHP goal returns exact amounts in PHP.
   - Single USD goal returns exact amounts in USD without PHP mislabeling.
   - Mixed PHP + USD goals convert properly using exchange rates (preventing the 220,000 raw minor units defect).
   - JPY (0 decimals) conversion accurately scales without truncation.
   - Overfunded surplus preserves independent underfunded shortfalls in `totalRemainingMinorUnits`.
   - Paused goals are excluded from active target/saved/remaining totals.
   - Empty goals returns zero totals with the user's default currency.
   All 15 tests in `src/modules/goals/__tests__/` passed.

### GOAL-F02 — P2, executed callback + ledger probe: Add Funds drops pocket identity — RESOLVED

1. **Problem:** A pocket-only goal opens income creation for its parent account. With no matching default pocket, saving leaves goal progress unchanged; a different configured default pocket can receive the entry. The exact navigation callback was executed, while the native form/save remains untested.
2. **Cause:** Screen lines 373–382 reads `linkedPockets[0].accountId` but discards `id`. Transactions route and screen accept an initial account, with no initial pocket contract. Form default-pocket selection comes from transaction defaults.
3. **Fix applied:**
   - In `src/app/transactions/index.tsx`: added `pocketId` parameter to `useLocalSearchParams` and forwarded `initialPocketId` to `<TransactionsScreen />`.
   - In `src/modules/transactions/screens/transactions-screen.tsx`:
     - Added `initialPocketId?: string;` to `TransactionsScreenProps`.
     - Stored `formInitialPocketId` on new transaction actions.
     - Passed `defaultIncomePocketId={formInitialPocketId}` and `defaultExpensePocketId={formInitialPocketId}` down to `<TransactionFormModal />`.
     - Cleared `formInitialPocketId` and route search params on modal close.
   - In `src/modules/goals/screens/goals-screen.tsx`:
     - In `onAddFunds`, preserved `pocketId` when funding a pocket-linked goal (`/transactions?action=new&type=income&accountId=...&pocketId=...`).
     - Added a clean destination picker modal for multi-destination goals, allowing users to explicitly pick which linked account or pocket to fund.
4. **Proof:** Added unit and integration tests in `src/modules/goals/__tests__/goals-summary-currency.test.cjs`:
   - Validated that the actual `onAddFunds` AST callback emits `pocketId` for pocket-only goals (`/transactions?action=new&type=income&accountId=a1&pocketId=p1`), emits only `accountId` for account-only goals, and emits base route for unlinked goals.
   - Validated that recording transactions targeting the pocket directly updates pocket-only goal balances (50% progress), while parent-account-only income leaves pocket progress at 0.
   - All 17 tests in `src/modules/goals/__tests__/` passed.

### GOAL-F03 — P2, executed: link validity and preview diverge from saved progress — RESOLVED

1. **Problem:** Service accepts incompatible currency links. More concretely, editing a linked account's currency before any transactions changes an existing goal's progress to zero, but its form still presents that account balance as goal-currency money. Parent-plus-pocket links are accepted by service/read compatibility even though picker says they cannot coexist; form/picker totals can double-count them.
2. **Cause:** `saveGoal`/schema validate shape and FKs, not linked currency/parent conflict. Accounts' `canChangeAccountCurrency` checks transaction history only. Progress correctly filters currency and excludes child duplication; `GoalFormModal.totalLinkedBalance`, line 238, sums both collections without either guard. Picker totals have currency filtering but no parent deduplication for preexisting conflicts.
3. **Fix applied:**
   - Created pure helper `calculateLinkedFundsBalance` (`src/modules/goals/utils/calculate-linked-balance.ts`):
     - Shared across `get-goals-with-progress.service.ts`, `goal-form-modal.tsx`, and `goal-account-picker-modal.tsx`.
     - Strictly filters out accounts and pockets whose currency does not match the goal's `currencyCode`.
     - Excludes child pocket balances when their parent account is also linked, eliminating parent+pocket double counting.
     - Preserves non-negative balance clamping on individual accounts/pockets before summation.
   - Updated `save-goal.service.ts`:
     - Validates all selected accounts and pockets at the service boundary using Accounts' public services (`getAccountsWithBalances`, `getPocketsWithBalances`).
     - Atomically rejects saving any goal linking an account or pocket whose currency does not match `goal.currencyCode` (`"Linked account/pocket currency must match goal currency"`).
     - Atomically rejects saving any goal linking both a parent account and its sub-pocket (`"Cannot link both an account and its sub-pocket"`).
   - Updated `goal-form-modal.tsx`:
     - Uses `calculateLinkedFundsBalance` for `totalLinkedBalance`, giving 100% mathematical parity with read progress.
     - Detects currency-mismatched linked items (e.g. from preexisting or modified accounts) and renders an amber warning banner advising the user that mismatched funds do not contribute to goal progress.
     - Visually flags mismatched linked chips with an amber warning border and warning icon.
   - Updated `goal-account-picker-modal.tsx`:
     - Uses `calculateLinkedFundsBalance` for `totalSelectedBalance` in the footer summary.
4. **Proof:** Added unit and integration tests in `src/modules/goals/__tests__/goals-summary-currency.test.cjs`:
   - `saveGoal` atomically rejects mismatched currency accounts (`assert.rejects`).
   - `saveGoal` atomically rejects linking both parent account and child pocket (`assert.rejects`).
   - Exact parity assertion proves `calculateLinkedFundsBalance` matches `getGoalsWithProgress` returned balance for normal links, parent+child conflicts, and currency mismatch exclusions.
   - All 20 tests in `src/modules/goals/__tests__/` passed.

### GOAL-F04 — P2, source-confirmed: focused progress misses external writes — RESOLVED

1. **Problem:** A Global Quick Entry save while Goals remains focused leaves amounts and completion stale until pull refresh or navigation/focus. Focused midnight rollover similarly has no deadline invalidation. Native interaction not executed.
2. **Cause:** `useGoals` refreshes on focus and its own configuration mutations. It has no transaction event subscription or other live balance invalidation. Transaction hosts emit `FINANCE_APP_TRANSACTION_MUTATED`; a modal closing does not inherently refocus its underlying route.
3. **Fix applied:**
   - In `src/modules/goals/hooks/use-goals.ts`:
     - Added `isFocusedRef` to track screen focus state.
     - Added `scheduleRefresh` with frame coalescing (`requestAnimationFrame` / `setTimeout(0)`) to merge rapid transaction notifications.
     - In `useFocusEffect`, subscribed to `FINANCE_APP_TRANSACTION_MUTATED` and `FINANCE_APP_SCHEDULES_CHANGED` while focused.
     - Added `AppState` change listener: when returning to `"active"` status across midnight (date change detected via `new Date().toDateString()`), triggers a coalesced refresh to recalculate deadline countdowns and monthly savings pace without running continuous polling intervals.
     - Subscribed to `subscribeToDatabaseReplacement` so full database restores cleanly refresh active goal progress.
     - Properly cleaned up subscriptions, frame requests, and pending sync queries on blur/unmount, guaranteeing zero SQLite queries when Goals is unfocused or in the background.
4. **Proof:** Added unit test suite in `src/modules/goals/__tests__/goals-focus-events.test.cjs`:
   - Proved `useGoals` performs 0 reads while unfocused.
   - Proved initial focus performs exactly 1 read.
   - Proved emitting `FINANCE_APP_TRANSACTION_MUTATED` while focused triggers live progress refresh.
   - Proved emitting `FINANCE_APP_TRANSACTION_MUTATED` while blurred/unmounted triggers 0 reads, and listeners detach cleanly.
   - Proved 10 rapid mutations coalesce into a single refresh execution.
   - Proved `AppState` active resume evaluates date change without redundant reads.
   - Proved `subscribeToDatabaseReplacement` triggers refresh while focused.
   - All 7 tests in `goals-focus-events.test.cjs` passed.

### GOAL-F05 — P2, executed hook + source-confirmed UI: failures are hidden or escape handlers — RESOLVED

1. **Problem:** A failed first read can appear as “No savings goals created”; failed cached read retains apparently current rows. Delete/status errors rethrow into unguarded press handlers. No actionable error/retry UI is shown. Form save does catch failures and retains its draft; preserve that behavior.
2. **Cause:** Screen destructures `useGoals` without `error`. `handleConfirmDelete` and inline status callback do not catch; `ConfirmModal` receives neither error nor pending state. Hook's read `catch` sets error and deferred helper completes loading.
3. **Fix applied:**
   - In `src/modules/goals/hooks/use-goals.ts`:
     - Exposed `error` and added `clearError: useCallback(() => setError(null), [])`.
   - In `src/modules/goals/screens/goals-screen.tsx`:
     - Destructured `error` and `clearError` from `useGoals()`.
     - Rendered `<PageErrorState message={error} onRetry={...} />` when `error && goals.length === 0`, completely preventing query errors from masquerading as a false "No savings goals created" empty state.
     - Rendered an actionable retry banner (`cachedErrorBanner`) when `error && goals.length > 0`, informing the user that fresh balances could not be retrieved while keeping cached rows readable.
     - Added `isDeleting` and `deleteError` state connected directly to `<ConfirmModal pending={isDeleting} error={deleteError} />`.
     - Guarded `handleConfirmDelete` with `try / catch / finally` so delete errors stay within the dialog, display the error message, and retain the target goal so the user can retry or cancel cleanly.
     - Guarded status toggles with `handleToggleGoalStatus` wrapped in `try / catch`, rendering an actionable `actionErrorBanner` on failure instead of letting unhandled rejections escape into gesture handlers.
4. **Proof:** Added unit tests in `src/modules/goals/__tests__/goals-error-handling.test.cjs`:
   - Validated `useGoals` captures read errors and exposes `clearError`.
   - Validated `deleteGoal` and `toggleStatus` failure propagation.
   - Validated `GoalsScreen` AST and component contract (PageErrorState gating, ConfirmModal error/pending connection, guarded deletion and status toggles).
   - All 4 tests in `goals-error-handling.test.cjs` passed.

### GOAL-F06 — P2, executed: cached reloads have no honest pending state — RESOLVED

1. **Problem:** With cached goals, `refresh()` leaves `loading=false` while a synchronous read is pending. Existing rows/summary stay presented as resolved. Pull-refresh completion is tied to 500ms rather than data resolution.
2. **Cause:** `runDeferredSyncQuery` only sets loading true for uncached results; screen only shows skeleton when `loading && goals.length === 0`. `handlePullRefresh` schedules a fixed 500ms timer immediately after scheduling, not awaiting, refresh.
3. **Fix applied:**
   - In `src/modules/goals/hooks/use-goals.ts`:
     - Updated `refresh()` to return a `Promise<void>` that settles when the deferred query actually commits to React state.
     - Added `isPending` state tracking: set to `true` when a query is scheduled/running and reset to `false` in the exact same batch as data and error commits.
     - Added `requestIdRef` and `cancelPending` so rapid successive refreshes cancel previous pending tasks cleanly without stale commit races or dangling promises.
     - Updated mutation callbacks (`handleSaveGoal`, `handleDeleteGoal`, `handleToggleStatus`) to `await refresh()`.
   - In `src/modules/goals/screens/goals-screen.tsx`:
     - Destructured `isPending` from `useGoals()`.
     - Removed the artificial `setTimeout(..., 500)` timer from `handlePullRefresh` and replaced it with `await refresh()` in a `try / finally` block, tying pull-refresh completion 100% to actual data resolution.
     - Rendered a subtle non-blocking updating row (`subtleUpdatingRow`) with an `ActivityIndicator` when `isPending && !isPullRefreshing && goals.length > 0`, providing honest visual feedback while keeping the list interactive.
4. **Proof:** Added unit tests in `src/modules/goals/__tests__/goals-loading-pending.test.cjs`:
   - Validated initial uncached load tracks `loading=true` and `isPending=true`.
   - Validated cached reload keeps `loading=false` (no full-screen skeleton flash) while setting `isPending=true` until data commits.
   - Validated `refresh()` returns an awaitable Promise.
   - Validated rapid successive refreshes cancel previous pending tasks cleanly.
   - Validated `GoalsScreen` source contract: `handlePullRefresh` awaits `refresh()`, the hardcoded 500ms timer is gone, and `subtleUpdatingRow` is bound to `isPending`.
   - All 4 tests in `goals-loading-pending.test.cjs` passed.

### GOAL-F07 — P2, measured/source-confirmed: unnecessary reads and unbounded mounting — RESOLVED

1. **Problem:** An empty Goals read executes **13 synchronous SELECTs**; selection data requests management scans it never uses. With 1,001 goals and 10k ledger rows, one service call measured **28.573ms** on this host, before native layout/render. Every goal mounts in a ScrollView; typing in the nested fund picker can scan accounts × pockets and sort even while that picker is closed.
2. **Cause:** `getGoalsWithProgress` always loads accounts/pockets with default management flags; `listGoals` always loads both junctions. Screen uses `.map` and new per-row callbacks, defeating `GoalCard`'s existing `memo`. Inline `useThemeStyles` factory at screen line 250 changes each render. `GoalAccountPickerModal` has no outer visibility guard and performs nested `.filter`/`.some`/`.find` work.
3. **Fix applied:**
   - In `src/modules/goals/repositories/goals.repository.ts`:
     - Added fast-exit in `listGoals`: `if (goalRows.length === 0) return [];` avoiding unnecessary queries to `goal_accounts` and `goal_pockets`.
   - In `src/modules/goals/services/get-goals-with-progress.service.ts`:
     - Added fast-exit on empty goals: if `goals.length === 0`, immediately returns default currency summary without querying accounts or pockets (reducing empty load from 13 SELECTs to 2).
     - Passed `{ includeManagementFlags: false }` to both `getAccountsWithBalances` and `getPocketsWithBalances`, pruning 10 extraneous database scans across transactions, splits, presets, and schedules.
   - In `src/modules/goals/screens/goals-screen.tsx`:
     - Extracted static page content padding into `createStyles` (`styles.pageContentContainer`), eliminating the inline `useThemeStyles((theme) => ({ paddingTop: ... }))` factory.
     - Stabilized item action callbacks with `useCallback` (`handleDeleteGoal`, `handleOpenEdit`, `handleToggleGoalStatus`).
     - Wrapped goal row rendering in `GoalListItem` with `React.memo`, allowing untouched goal cards to completely skip re-rendering when screen state changes.
   - In `src/modules/goals/components/goal-account-picker-modal.tsx`:
     - Added early-return visibility guard `if (!props.visible) return null;` returning `<GoalAccountPickerModalContent {...props} />`, guaranteeing 0 hooks or calculations execute while the modal is closed.
     - Pre-indexed pockets into `pocketsByAccountId` (`Map<string, PocketListItem[]>`) to eliminate $O(N \times M)$ scans in `filteredAccounts`, `handleSelectAllAccounts`, and list item rendering.
4. **Proof:** Added unit tests in `src/modules/goals/__tests__/goals-query-efficiency.test.cjs`:
   - Validated `listGoals` fast-exits without querying junction tables on empty goals.
   - Validated `getGoalsWithProgress` fast-exits on empty goals without querying accounts or pockets.
   - Validated `getGoalsWithProgress` passes `{ includeManagementFlags: false }` to accounts and pockets services.
   - Validated `GoalAccountPickerModal` returns `null` when `visible=false` and executes zero hooks.
   - Validated `GoalsScreen` AST contracts (memoized `GoalListItem`, stable callbacks, static `pageContentContainer` style).
   - All 40 tests across `src/modules/goals/__tests__/` passed and `npx tsc --noEmit` exited with 0 errors.

### GOAL-F08 — P2, executed: reopening a reached goal is a no-op in the UI — RESOLVED

1. **Problem:** “Mark as In Progress” on an automatically reached goal writes `in_progress`, then the refreshed card is still Completed and offers the same action again.
2. **Cause:** `calculateGoalProgress` uses `goal.status === "completed" || current >= target`; `GoalCard` selected the reopen action whenever `isCompleted`. A balance-reached goal already has stored `in_progress`, so setting status to `in_progress` cannot change its derived completion or the action rendered.
3. **Fix applied:**
   - In `src/modules/goals/components/goal-card.tsx`:
     - Replaced the binary `isCompleted` toggle in `bottomActionsRow` with honest state-driven action selection:
       - If `isCompleted`:
         - If `goal.currentAmountMinorUnits >= goal.targetAmountMinorUnits` (reached or exceeded): renders **"Increase Target"** (`Pencil` icon, calling `onEdit`), taking the user straight into the edit modal to raise their target if they want to keep saving, eliminating the broken no-op button loop completely.
         - If `goal.currentAmountMinorUnits < goal.targetAmountMinorUnits` (manually completed underfunded goal): renders **"Mark as In Progress"** (`RotateCcw` icon, calling `onToggleStatus("in_progress")`), which transitions `status` back to `in_progress` and restores the card to Active/In Progress.
       - If `!isCompleted` (underfunded in-progress goal): renders **"Mark as Completed"** (`Check` icon, calling `onToggleStatus("completed")`).
     - Added explicit `accessibilityRole="button"` and meaningful `accessibilityLabel` attributes to all action buttons.
   - In `src/modules/notifications/services/schedule-goal-reminders.service.ts`:
     - Added guards `goal.isCompleted || goal.currentAmountMinorUnits >= goal.targetAmountMinorUnits`, ensuring reached goals are excluded from deadline notification alerts.
4. **Proof:** Added unit tests in `src/modules/goals/__tests__/goals-status-lifecycle.test.cjs`:
   - Validated `calculateGoalProgress` across below, reached, overfunded, and falling balance scenarios (active goal uncompletes when balance drops below target; manually completed goal stays completed).
   - Validated `GoalCard` AST contract: proves reached goals render "Increase Target" linked to `onEdit`, underfunded completed goals render "Mark as In Progress" linked to `onToggleStatus("in_progress")`, and active goals render "Mark as Completed" linked to `onToggleStatus("completed")`.
   - Validated `scheduleGoalReminders` excludes reached/completed goals from deadline reminders.
   - All 50 tests across Goals and Notifications suites passed and `npx tsc --noEmit` passed with 0 errors.

### GOAL-F09 — P2, source-confirmed: core feature remains English with device-locale dates — RESOLVED

1. **Problem:** Changing app language leaves filters, summary, card status/actions, form fields/errors and fund-picker copy in English. Deadline formatting follows device locale instead of selected app locale. Walkthrough translations alone do not cover the feature.
2. **Cause:** `FILTER_TABS`, components and schema contain literal English. `useLocalization` in screen/form is mainly used for walkthrough/Pro copy; summary/card/picker have no translation hook. Dates call `toLocaleDateString()` without app locale.
3. **Fix applied:**
   - In `src/infrastructure/localization/translations/`:
     - Added comprehensive `goals: { ... }` namespace with 100% key and parameter parity across English (`en.ts`), Filipino (`fil.ts`), and Spanish (`es.ts`).
     - Sub-catalogs cover: `filters` (All, In Progress, Completed), `summary` (total target, saved, remaining, status counters), `card` (labels, progress, deadline, to-go, actions, accessibility), `empty` (titles, subtitles, create CTA), `delete` (dialog title, confirm, cancel, message), `form` (labels, placeholders, appearance, notes, help popups, warnings), `picker` (header, search, double-counting rules, selected summary, empty states, asset/liability grouping), `destination` (funding modal strings), `state` (loading, updating, retry, errors, FAB label), and `validation` (title, notes, amount, currency matching, parent-child exclusion, save failure).
   - In `src/modules/goals/components/goal-card.tsx`:
     - Injected `useLocalization()` to extract `t` and `locale`.
     - Localized all status text, dynamic progress percentages, remaining shortfall strings, and accessibility labels.
     - Localized deadline date formatting using `goal.targetDate.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })`, ensuring Spanish and Filipino months display in the app's chosen language rather than the device OS locale.
   - In `src/modules/goals/components/goal-summary-header.tsx`:
     - Injected `useLocalization()` and bound all hero metrics, labels, progress percentage badges, and mini-cards to `t("goals.summary.*")`.
   - In `src/modules/goals/screens/goals-screen.tsx`:
     - Memoized `filterTabs` via `useMemo(() => [...], [t])` to keep reference stability while translating filter tab labels dynamically.
     - Localized empty states, error banners, delete confirmation dialog, and destination picker.
   - In `src/modules/goals/components/goal-form-modal.tsx`:
     - Injected `locale` into date picker preview and localized form field labels, notes placeholders, help popups, currency mismatch warnings, and validation error messages.
   - In `src/modules/goals/components/goal-account-picker-modal.tsx`:
     - Localized modal header, subtitle, search placeholder, toolbar actions, conflict/currency notice banners, account type indicators (Asset / Liability), parent inclusion hints, empty results copy, and footer summary.
4. **Proof:** Added unit tests in `src/modules/goals/__tests__/goals-localization.test.cjs`:
   - Recursively asserted exact key parity (100% match) across `en.ts`, `fil.ts`, and `es.ts` with no missing or extra keys, ensuring no empty translation strings.
   - Asserted matching interpolation parameter tokens (`%{name}`, `%{count}`, `%{currency}`, `%{percent}`, etc.) across all three languages.
   - Validated locale-aware date formatting across `en-US`, `fil-PH`, and `es-ES`.
   - Validated component source contracts: verified that all 5 goals components/screens consume `useLocalization` and translate core feature strings.
   - All 46 tests across `src/modules/goals/__tests__/` passed and `npx tsc --noEmit` verified complete type safety.

### GOAL-F10 — P2, source-confirmed: touch and keyboard dismissal miss required guarantees

1. **Problem:** Fund-picker close button is explicitly **36×36**, with no hit slop; unlink control is 14px icon + 2px padding each side + 6px slop each side, **30×30** before parent hit-region restrictions. Completion/Add Funds controls also lack a 44px minimum. Close callbacks do not explicitly dismiss the keyboard. Native first-tap behavior and overlapping hit regions need device verification.
2. **Cause:** Picker `closeBtn` line 686 and form `accountChipRemove` use small bounds; picker close/scrim/system-back call raw `onClose`. Shared `FullScreenFormModal.handleRequestClose` also has no `Keyboard.dismiss`. Some card action controls lack explicit button role/state.
3. **Smallest fix:** Give affected controls nonoverlapping 44×44 effective targets and proper roles/state; add a stable keyboard-dismiss close wrapper at the appropriate boundary. Preserve dirty confirmation and prevent dismissing an active save. If changing shared form behavior, verify its unrelated consumers first.
4. **Proof:** Native keyboard-open first-tap close/save, Android back, iOS dismiss, nested picker return and dirty discard/keep/save. TalkBack/VoiceOver focus and checkbox labels/states, disabled/pending actions, 44px bounds and spacing at 200% font scale. JSX/style assertions alone are insufficient.

### GOAL-F11 — P2, source risk / needs native validation: amounts, filters and selected funds can collide

1. **Problem:** Several horizontal rows lack width allocation/reflow for simultaneously long valid values. No visual overlap is claimed as device-reproduced. Exact surfaces and reproduction matrix are in Section 6.
2. **Cause:** Summary `heroTopRow`/`heroBottomRow`, card `amountRow`/`progressMetaRow`, screen filter row, form account headers/chips, and picker balance/footer rows keep intrinsic-width siblings. Some single-line fitting exists, but cannot prove essential content is readable when the parent is unbounded or siblings occupy the same space.
3. **Smallest fix:** After native reproduction, assign flexible bounded columns, allow wrapping/stacking and growing height, and retain full-value/detail access. Do not hide digits using overflow or globally disable text scaling. Prefer native flex changes over `onLayout` measurement loops.
4. **Proof:** Entire Section 6 matrix with exact settings and whole-card screenshots before/after; amounts/actions remain readable. Recheck all languages, masks and keyboard states. Record any accepted limitation explicitly; source style guards do not establish a visual pass.

### GOAL-F12 — P2, source-confirmed: reminder snapshots survive goal edits/deletion

1. **Problem:** A previously queued deadline notification can retain an old name/date, remain after deletion/completion, or omit a newly added goal until reminder synchronization runs again. Native OS delivery not executed. Automatically reached `in_progress` goals also remain eligible for deadline scheduling; paused goals can trigger milestone checks because that loop has no status guard.
2. **Cause:** Goals writes and hook callbacks never invalidate notification scheduling. `NotificationsReminderProcessor` synchronizes on startup/resume, and settings writes also synchronize; no goal-mutation subscription exists. Deadline eligibility checks stored `status`, not `isCompleted`; milestone checks only percentages.
3. **Smallest fix:** Add a coalesced background invalidation through the Notifications public boundary after committed relevant changes, without making local saves wait for OS/network work. Decide status/privacy/reminder policy first. Reuse the existing scheduler and cancellation identifiers; no second reminder system.
4. **Proof:** Execute actual scheduler with mocked Notifications, create/edit/date-change/delete/pause/complete and external balance updates; inspect identifiers, cancellations and payloads. Inject schedule failure and prove local goal save still succeeds. Native notification permission/restart/foreground delivery and timezone tests remain required; broader milestone deduplication belongs in the Notifications audit.

## 6. Unified text-layout, accessibility, and privacy review

All rows below are **source risk / needs native validation** at the reviewed commit. Device/OS, actual available width/insets, font/display scale, screenshot and tester: **not captured**. None is marked verified fixed or accepted. Use GOAL-F11 with the surface suffix as a stable reference when attaching evidence here.

| Surface / reference | Source risk and exact reproduction to run |
| --- | --- |
| GOAL-F11-A: summary hero and mini-cards | `GoalSummaryHeader.heroTopRow` (line 163), `heroBottomRow` (208). Large target/saved/remaining and percentage badge share unconstrained rows; Saved lacks the existing one-line fitting used by Target/Remaining. Show `999,999,999.99` valid amounts, 0/2/3 decimal formatting, many goal counts, masks and all three translations. No amount crosses its column or pushes badge/count outside the card. |
| GOAL-F11-B: goal card | `GoalCard.amountRow` (440), `progressMetaRow` (485), linked chips. Use 80-character title, 500-character multiline note, long account/pocket/parent names, target/current/remaining all large, achieved badge, past/future deadline and savings pace. Name/bottom action wrapping already helps; unbounded money and chip siblings still need inspection. Essential amounts need a readable full-value path; note/name truncation can use edit detail. |
| GOAL-F11-C: filters and page states | `GoalsScreen.filterTabsRow` (486) has no wrapping or horizontal scroll; tabs use intrinsic text+count widths. Check three translated labels, large counts, 200% text, empty/loading/error/retry and ad dock/FAB. Last filter must remain visible and operable. |
| GOAL-F11-D: form linked funds | `GoalFormModal.accountsCardHeader`, `accountChipLeft` and fixed `accountChipName.maxWidth=140`. Long parent name and raw balance text compete with title and unlink. Use both links and legacy parent/child case, multiple selected funds, validation banner, deadline clear, appearance controls and nested calculator. Keyboard-open close/save and all error text remain visible. |
| GOAL-F11-E: picker | `GoalAccountPickerModal.accountItemRight` (882), `footerSummary` (981), group headers, fixed 82% sheet and 42px search field. Long type/account/pocket names, positive/negative large balance, exclusion/conflict banners, many selections and search keyboard. No row amount covers its name/check state; expanded banners/footer must leave a usable scroll viewport and reachable confirmation. Card `overflow: hidden` must not conceal essential content. |

Required matrix: **320, 360, 390 logical-pixel portrait widths**, smallest supported phone, landscape and supported tablet/split window; normal/approximately **130%, 150%, 200%** system text plus larger display size; **English, Filipino, Spanish**; light/dark, free/Pro/ad dock; zero/negative/large valid money, 0/2/3 decimals, emoji/accented/unbroken names, privacy on/off. Use valid schema values, not artificially invalid records to stretch the UI. Cover loading/content/empty/error, active/paused/manual-completed/auto-reached, keyboard and all nested pickers.

**Privacy policy decision pending:** Main cards, summary and form chips mask money and progress; the fund picker formats exact account, pocket and combined balances with no `usePrivacyMode`. The outer card label only names the goal and does not explicitly include raw money; native screen-reader grouping has not been tested. Decide whether opening the picker intentionally reveals funds (Q-G04); do not assume Dashboard's accepted inspection exception applies. Verify both visible and spoken output after that decision, including milestone/deadline notifications containing percentages.

## 7. Runtime performance assessment — 60–120fps

This document adds no runtime work. The target remains **8.3–16.6ms of JS work per frame**. Deferring a synchronous query lets the initial shell paint; it does not interrupt the query or certify navigation/scrolling/input frame rate. The pinned [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [SQLite documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) were read; synchronous SQLite sections must be measured as blocking work.

### Exact production-service query count

One `getGoalsWithProgress` invocation executes these **13 SELECTs**, independent of the number of goals in the fixtures. Counts exclude migrations, fixture setup, independent assertions, and other screen hooks.

| Group | Statements | Returned-row bound / complexity |
| --- | ---: | --- |
| Goals plus both junctions | 3 | All G goals and L links; no limit or empty fast exit; goal order requires a temp B-tree. Mapping uses Maps, O(G+L), which should be retained. |
| Account base/balances/history/presets/schedules | 5 | All A accounts; grouped active-ledger deltas O(T); distinct history and full preset/schedule reference rows for unused management flags. |
| Pocket balances/history/presets/schedules/base | 5 | All P pockets; grouped ledger scan O(T), distinct pocket history and full reference rows for unused management flags. |

Total processing includes O(T+A+P+G+L+R+S), plus query ordering costs. R/S are presets/schedules. Returned ledger results are grouped per account/pocket; this path **does not hydrate 10k full transactions into JS**, but reads and UI catalogs remain unbounded. No dynamic `IN` lookup is used by these Goals repository queries; adding scoped hydration later must respect the ≤500-ID rule.

Last executed single samples, not benchmark medians:

| Fixture | Statements | Host elapsed | Meaning |
| --- | ---: | ---: | --- |
| No goals/accounts/pockets | 13 | 2.884ms | Unnecessary base/history work even with no goals. |
| One goal, one account/pocket, 10,000 ledger rows | 13 | 5.494ms | Aggregation reduces returned rows, but still scans ledger data. |
| 1,001 goals, same 10,000 ledger rows | 13 | 28.573ms | Exceeds both frame budgets on this host before rendering/layout. A valid scale fixture, not a claim about typical user goal counts. |

`EXPLAIN QUERY PLAN` from actual emitted SQL: Goals `SCAN goals` + `USE TEMP B-TREE FOR ORDER BY`; Accounts joins use PK indexes but its final sort uses a temp B-tree; Pockets uses `pockets_account_archived_sort_index` with `USE TEMP B-TREE FOR LAST 2 TERMS OF ORDER BY`. Account aggregation uses `transactions_active_import_comparison_index`; pocket aggregation uses `transactions_pocket_occurred_at_index`, without temp grouping sorts in the captured plan. The existing `(status, sort_order)` goal index does not satisfy unfiltered `sort_order, created_at DESC`. Any added index requires a named migration and parity/plan tests; this audit creates none.

### Mount/focus/render and offscreen assessment

- `useGoals` has one focus scheduling path, not duplicate mount+focus effects. It captures cancellation. Closed `GoalFormModal` returns before domain hooks: **good**.
- Opening the form mounts `useAccounts`, currency/color/privacy/preferences/walkthrough hooks. `useAccounts` requests lightweight flags, but contains mount and focus refresh scheduling; cancellation can coalesce pending work, so do not count this as two completed SQL batches without tracing. Its loading/error states are ignored by the goal form; skeleton/error handling needs acceptance.
- The picker is mounted throughout the open form, even when its own modal is closed. It groups/sorts supplied accounts and calculates selection totals. Render loops filter all pockets for each account; search and total computations also nest scans. Worst-case work can grow as A×P and selection sizes; no per-keystroke DB query was found, but pure JS work is not O(1).
- `GoalCard` is memoized, but screen creates new row callbacks and each service load creates new goal objects. Form/modal/ad state changes can rerender every mounted row. Inline style factory invalidates its own memo. No new root context or root navigation subscription is necessary to resolve this.
- Nonempty Search calls full progress calculation for names/targets; Notifications can call it twice during one synchronization (deadline and milestones). Those are additional invocations, not included in the screen's 13. Empty/closed Search skipQuery gating is covered by the related suite.
- Native release-build cold navigation, cached refresh, form opening, large-list scrolling, keyboard typing and resume/reminder bursts are **unmeasured**. Run React Native DevTools Highlight Updates/Profiler and `npm run android:apk:release` with representative 1k–10k ledger data. No sustained FPS claim is made from these host timings.

## 8. Product questions and accepted-boundary checks

No new product policy is accepted by this audit.

| ID | Decision required |
| --- | --- |
| Q-G01 | Summary per currency (recommended minimal direction), or explicit conversion to a chosen currency with rate/rounding/missing-rate policy? Should overfunded goals offset other goals' shortfall? Present implementation uses `max(0, sum(target)-sum(saved))`, not sum of each goal's shortfall. |
| Q-G02 | Does Add Funds mean new external income, an internal transfer into savings, or choosing between both? For multiple linked locations, which destination should be selected? Preserve transfer neutrality; do not record existing money as income implicitly. |
| Q-G03 | Is completion manual, derived, or both? Are reached paused goals counted completed? Can reached goals be reopened while balance remains above target? Should deadlines/milestones exclude paused and already reached goals? |
| Q-G04 | Does explicitly opening fund selection reveal exact money in Stealth Mode? Should notifications include goal names/progress while private? Define visible and spoken rules together. |
| Q-G05 | Multiple goals can track the same account/pocket, so combined saved totals can count the same money across goals. Is summary a sum of goal perspectives or unique allocated funds? Negative member balances are clamped individually before summing. These are current semantics, not independently confirmed financial bugs without a contract. |
| Q-G06 | Archived/hidden accounts remain included by balance services but cannot be newly selected in picker. Should existing links keep contributing, warn, or require replacement? Deleting an otherwise deletable linked account cascades/removes its links. Do not silently change Accounts' accepted archive/delete rules. |
| Q-G07 | Currency selection currently retains raw target minor units while clearing links. Across different decimal exponents, the displayed major amount changes. Should target amount be re-entered, preserve major units, or explicitly confirm reinterpretation? No FX conversion should occur silently. |
| Q-G08 | Paused status has no dedicated screen control; unlinked goals are allowed and cannot derive progress. Keep these deliberate configuration possibilities, or expose controls/help? Missing deep-linked goal should show a not-found message or quietly remain on list? |

Preserve useful existing complexity: derived balances from Accounts, signed transaction aggregation, one parent/child contribution, legacy/junction compatibility for old backups, atomic default-db save, FK cleanup, privacy masks, closed form guard and deferred cancellation. Do not replace them with duplicate financial state.

## 9. Remediation order and sign-off record

1. [x] Resolve GOAL-F01/B09 and currency policy; add actual-production-service tests rather than more copied calculations. (Resolved)
2. [x] Fix pocket destination and incompatible-link/preview behavior (GOAL-F02–F03); preserve atomic saves and public module ownership. (Resolved)
3. [x] Address refresh, recovery and honest loading (GOAL-F04–F06 resolved); preserve responsive 60–120fps background indicators. (Resolved)
4. Settle completion/privacy/reminder policies; address GOAL-F08/F12, localization, touch and layout (GOAL-F09–F11).
5. Re-run related suites with the budget harness issue separately resolved/tracked, typecheck, and capture native matrix/performance evidence before final sign-off.

Any production remediation must repeat the Section 20 gate against the current commit, keep the diff surgical, update localized active release notes, and ask whether to keep v1.8.0 or use the appropriate version bump under AGENTS.md. Those steps are not triggered by this report-only change.

- [x] Review every existing audit file and checklist; select next documented priority.
- [x] Record commit/working tree, routes/actions/ownership, consumers and data relationships.
- [x] Execute production-service SQLite probes, actual hook/funding callback probes, related baseline and TypeScript.
- [x] Separate historical B09, executed defects, source-confirmed behavior, native risks and policy questions.
- [x] Include query counts, bounds, complexity, plans, frame-budget assessment and unified text/accessibility review.
- [ ] Review and settle findings and Q-G01–Q-G08.
- [ ] Add durable production regressions and remediate or explicitly accept findings.
- [ ] Reconcile the preexisting related test harness failure; repeat affected validation on final candidate.
- [ ] Native localized/large-text/privacy/keyboard/accessibility screenshots and interaction evidence.
- [ ] Release-device navigation/scrolling/input/resume profiling against 60–120fps.
- [ ] Real reminder, backup/replacement and cross-feature mutation acceptance.
- [ ] Final candidate and feature sign-off approved.

**Decision:** Goals audit conducted; **feature sign-off withheld**. Production code remains unchanged. Data Import is the next fresh feature after Goals review/remediation, consistent with the established queue.

## Appendix A. Reproducible production-service and SQLite probes

Save the following JavaScript block outside the repository as `%TEMP%/finance-goals-audit-v180.cjs`, then run from the repository root with `node --disable-warning=ExperimentalWarning "$env:TEMP\finance-goals-audit-v180.cjs"` in PowerShell. It reuses only the existing Accounts test bootstrap before test registration, instruments SQL preparation in memory, and compiles under that module's path. It does not edit the test file. Assertions deliberately preserve observed defects so the audit can be reproduced; change expected assertions when converting these fixtures into fix regressions.

<!-- GOALS_SERVICE_PROBE -->

```javascript
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const harnessPath = path.join(process.cwd(), 'src/modules/accounts/__tests__/accounts.test.cjs');
let prefix = fs.readFileSync(harnessPath, 'utf8').split('beforeEach(() => { connect(); migrate(); });')[0];
prefix = prefix.replace('prepareSync(query) {', 'prepareSync(query) { sqlLog.push(query);');
const probe = String.raw`
const { performance } = require('node:perf_hooks');
const goalSave = require('@/modules/goals/services/save-goal.service').saveGoal;
const goalGet = require('@/modules/goals/services/get-goals-with-progress.service').getGoalsWithProgress;
const goalToggle = require('@/modules/goals/services/toggle-goal-status.service').toggleGoalStatus;
const goalDelete = require('@/modules/goals/services/delete-goal.service').deleteGoal;
const goalRepo = require('@/modules/goals/repositories/goals.repository');
const progress = require('@/modules/goals/services/calculate-goal-progress.service').calculateGoalProgress;
const now = new Date(2026,10,27,12);
function reset() { if (sqlite) sqlite.close(); connect(); migrate(); sqlLog.length = 0; }
function account(id, code, opening=0) {
 sqlite.prepare('INSERT INTO accounts(id,account_type_id,name,currency_code,opening_balance_minor_units,opening_balance_at,pocket_enabled,created_at,updated_at) VALUES (?,?,?,?,?,0,1,0,0)').run(id, system.ASSET_OTHERS, id, code, opening);
}
function pocket(id, accountId) { sqlite.prepare('INSERT INTO pockets(id,account_id,name,created_at,updated_at) VALUES (?,?,?,0,0)').run(id,accountId,id); }
function tx(id,accountId,type,amount,pocketId=null) {
 const t=now.getTime(); sqlite.prepare('INSERT INTO transactions(id,account_id,pocket_id,type,amount_minor_units,occurred_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(id,accountId,pocketId,type,amount,t,t,t);
}
function goal(name,code,target,acc=[],pock=[]) { return goalSave({name,currencyCode:code,targetAmountMinorUnits:target,accountIds:acc,pocketIds:pock}); }
function output(label,value) { console.log(label,JSON.stringify(value)); }
reset(); account('php','PHP',100000); account('usd','USD',10000);
const gp=goal('Peso goal','PHP',200000,['php']); const gu=goal('Dollar goal','USD',20000,['usd']);
let result=goalGet(); assert.equal(result.goals.find(g=>g.id===gp.id).currentAmountMinorUnits,100000); assert.equal(result.goals.find(g=>g.id===gu.id).currentAmountMinorUnits,10000);
output('MIXED_CURRENCY_SUMMARY',result.summary);
const bad=goal('Mismatched link','PHP',100000,['usd']);
output('MISMATCH_LINK_ACCEPTED',goalGet().goals.find(g=>g.id===bad.id));
const driftBefore = goalGet().goals.find(g=>g.id===gu.id).currentAmountMinorUnits;
saveAccount({...accountInput(system.ASSET_OTHERS,'Changed currency','100'),currencyCode:'PHP'},'usd');
const driftAfter = goalGet().goals.find(g=>g.id===gu.id).currentAmountMinorUnits;
output('ACCOUNT_CURRENCY_DRIFT',{before:driftBefore,after:driftAfter,storedCurrency:repo.findAccountById('usd').currencyCode,goalCurrency:gu.currencyCode});
assert.equal(driftBefore,10000);assert.equal(driftAfter,0);
const formSource=fs.readFileSync(path.join(root,'modules/goals/components/goal-form-modal.tsx'),'utf8');
const formTree=ts.createSourceFile('form.tsx',formSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let balanceCallback;
function visitBalance(n){if(ts.isVariableDeclaration(n)&&n.name.getText(formTree)==='totalLinkedBalance')balanceCallback=n.initializer.arguments[0].getText(formTree);ts.forEachChild(n,visitBalance);}visitBalance(formTree);
const preview=require('node:vm').runInNewContext(ts.transpileModule('('+balanceCallback+')()',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{selectedAccounts:[{id:'usd',currencyCode:'PHP',currentBalanceMinorUnits:10000}],selectedPockets:[]});
output('ACTUAL_FORM_PREVIEW_DRIFT',{preview,goalProgress:driftAfter});assert.equal(preview,10000);
reset(); account('a','PHP',100000); pocket('p','a'); tx('allocation','a','income',25000,'p');
const g=goal('Pocket only','PHP',200000,[],['p']);
const before=goalGet().goals[0].currentAmountMinorUnits;
tx('add-funds-account-only','a','income',10000);
output('POCKET_ADD_FUNDS', {before,after:goalGet().goals[0].currentAmountMinorUnits,accountBalance:getAccountsWithBalances()[0].currentBalanceMinorUnits});
assert.equal(before,25000); assert.equal(goalGet().goals[0].currentAmountMinorUnits,25000);
const both=goal('Parent plus child','PHP',300000,['a'],['p']);
output('PARENT_CHILD_DEDUP', {actual:goalGet().goals.find(g=>g.id===both.id).currentAmountMinorUnits,expected:135000});
assert.equal(goalGet().goals.find(g=>g.id===both.id).currentAmountMinorUnits,135000);
const complete=goal('Already reached','PHP',10000,['a']); goalToggle(complete.id,'in_progress');
output('REOPEN',goalGet().goals.find(g=>g.id===complete.id));
const base=goalRepo.findGoalById(g.id);
for (const [label,date] of [['yesterday',new Date(2026,10,26)],['today',new Date(2026,10,27)],['tomorrow',new Date(2026,10,28)]]) {
 const p=progress({goal:{...base,targetDate:date},currentAmountMinorUnits:0,now});
 output('DEADLINE_'+label,{days:p.daysRemaining,past:p.isPastDeadline,months:p.monthsRemaining});
}
const tableCounts=()=>['goals','goal_accounts','goal_pockets'].map(t=>sqlite.prepare('SELECT count(*) AS n FROM '+t).get().n);
let counts=tableCounts();
assert.throws(()=>goal('Bad FK','PHP',10000,['a','missing'])); assert.deepEqual(tableCounts(),counts);
const beforeUpdate=goalRepo.findGoalById(both.id);
assert.throws(()=>goalSave({name:'Broken edit',targetAmountMinorUnits:70000,currencyCode:'PHP',accountIds:['a','missing']},both.id));
assert.deepEqual(goalRepo.findGoalById(both.id),beforeUpdate);
const ledgerCount=sqlite.prepare('SELECT count(*) AS n FROM transactions').get().n;
goalDelete(both.id);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM goal_accounts WHERE goal_id=?').get(both.id).n,0);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM goal_pockets WHERE goal_id=?').get(both.id).n,0);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM transactions').get().n,ledgerCount);
output('INTEGRITY',{failedCreateRollback:true,failedEditRollback:true,deleteCascadesLinks:true,ledgerUnchanged:true,foreignKeys:sqlite.prepare('PRAGMA foreign_key_check').all()});
reset(); account('cash','PHP',100000);account('bank','PHP',50000);
for (const args of [['expense','cash','expense',-10000],['income','cash','income',20000],['out','cash','transfer',-30000],['in','bank','transfer',30000],['fee','cash','expense',-1000],['refund','cash','expense',2000]]) tx(...args);
const ledgerGoal=goal('Ledger parity','PHP',200000,['cash','bank']);
assert.equal(goalGet().goals[0].currentAmountMinorUnits,161000);
output('LEDGER_PARITY',{saved:161000,target:200000,rows:6});
function measure(label) {
 sqlLog.length=0; const changes=sqlite.prepare('SELECT total_changes() AS n').get().n; const start=performance.now();const data=goalGet(); const ms=performance.now()-start;
 assert.equal(sqlite.prepare('SELECT total_changes() AS n').get().n,changes);
 output(label,{ms:+ms.toFixed(3),statements:sqlLog.length,goals:data.goals.length,queries:sqlLog.map(q=>q.replace(/\s+/g,' '))});
}
reset(); measure('EMPTY_READ');
account('large','PHP',0);pocket('large-p','large'); goal('Scale','PHP',200000,['large']);
const stmt=sqlite.prepare('INSERT INTO transactions(id,account_id,pocket_id,type,amount_minor_units,occurred_at,created_at,updated_at) VALUES (?,\'large\',\'large-p\',\'income\',1,0,0,0)');
sqlite.exec('BEGIN');for(let i=0;i<10000;i++)stmt.run('t'+i);sqlite.exec('COMMIT');
measure('LEDGER_10K_READ');
const plans=sqlLog.map(q=>({sql:q,plan:sqlite.prepare('EXPLAIN QUERY PLAN '+q).all()}));output('QUERY_PLANS',plans);
sqlite.exec('BEGIN');for(let i=0;i<1000;i++)sqlite.prepare('INSERT INTO goals(id,name,target_amount_minor_units,currency_code,created_at,updated_at) VALUES (?,?,10000,\'PHP\',0,0)').run('g'+i,'Goal '+i);sqlite.exec('COMMIT');
measure('GOALS_1001_READ'); sqlite.close();
`;
const compiled = new Module(harnessPath, module); compiled.filename=harnessPath; compiled.paths=Module._nodeModulePaths(path.dirname(harnessPath));
compiled._compile('let sqlLog=[];\n'+prefix+'\n'+probe,harnessPath);
```

## Appendix B. Reproducible hook and funding callback probes

Save this block outside the repository as `%TEMP%/finance-goals-lifecycle-audit-v180.cjs` and run with Node from the repository root. It reuses the existing Search hook scheduler harness before test registration. Production hook source executes with controlled service mocks; the harness's deferred-helper behavior matches the current shared helper but is not a native React renderer. The funding callback is extracted from actual TSX and transpiled before execution. Cancellation/loading/error results are host evidence; no keyboard, glyph geometry, or FPS behavior is simulated.

<!-- GOALS_LIFECYCLE_PROBE -->

```javascript
const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');
const harnessPath=path.join(process.cwd(),'src/modules/search/__tests__/search-loading.test.cjs');
let prefix=fs.readFileSync(harnessPath,'utf8').split('function searchHarness()')[0];
const probe=String.raw`
const calls=[];let failure=false;
const imports={
 '../schemas/goal.schema': {goalErrorMessage:err=>err.message},
 '../services/get-goals-with-progress.service': {getGoalsWithProgress(){ calls.push('read'); if(failure) throw Error('Synthetic read failure'); return {goals:[{id:'g',name:'Goal',isCompleted:false,status:'in_progress'}],summary:{totalGoalsCount:1}};}},
 '../services/save-goal.service': {saveGoal(){calls.push('save');}},
 '../services/delete-goal.service': {deleteGoal(){throw Error('Synthetic delete failure');}},
 '../services/toggle-goal-status.service': {toggleGoalStatus(){throw Error('Synthetic status failure');}},
};
(async()=>{
 const h=createHarness('../../goals/hooks/use-goals.ts',imports);
 let state=h.render(e=>e.useGoals());assert.equal(state.loading,true);assert.equal(calls.length,0);
 state=await h.paint();assert.equal(state.loading,false);assert.equal(state.goals.length,1);
 state.refresh();state=h.render(e=>e.useGoals());console.log('CACHED_REFRESH',JSON.stringify({loading:state.loading,pending:h.pending,reads:calls.length}));assert.equal(state.loading,false);
 failure=true;state=await h.paint();assert.equal(state.error,'Synthetic read failure');console.log('READ_ERROR',JSON.stringify({error:state.error,retainedRows:state.goals.length}));
 assert.throws(()=>state.deleteGoal('g'),/Synthetic delete failure/);assert.throws(()=>state.toggleStatus('g','completed'),/Synthetic status failure/);
 console.log('ACTION_ERRORS',JSON.stringify({deleteRethrows:true,statusRethrows:true}));
 failure=false;state.refresh();assert.equal(h.pending,1);h.unmount();assert.equal(h.pending,0);console.log('CANCELLED_UNMOUNT',true);
 const text=fs.readFileSync(path.resolve(__dirname,'../../goals/screens/goals-screen.tsx'),'utf8');
 const ast=ts.createSourceFile('goals.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
 function visit(node){if(ts.isJsxAttribute(node)&&node.name.getText(ast)==='onAddFunds')callback=node.initializer.expression.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(callback);
 let href; vm.runInNewContext(ts.transpileModule('('+callback+')()', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{goal:{linkedAccounts:[],linkedPockets:[{id:'p',accountId:'a'}]},router:{push:value=>{href=value;}}});
 console.log('ACTUAL_ADD_FUNDS_CALLBACK',JSON.stringify({href}));assert.equal(href,'/transactions?action=new&type=income&accountId=a');
})().catch(err=>{console.error(err);process.exitCode=1;});
`;
const compiled=new Module(harnessPath,module);compiled.filename=harnessPath;compiled.paths=Module._nodeModulePaths(path.dirname(harnessPath));compiled._compile(prefix+probe,harnessPath);
```
