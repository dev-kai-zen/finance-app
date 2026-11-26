# Calendar audit — v1.8.0

**Date:** November 25, 2026 — Asia/Singapore

**Reviewed commit:** `5a192bf` (working tree initially clean)

**Stage:** 1 — Audit complete; targeted validation performed. Findings review, durable regression expansion, remediation, and feature sign-off remain open.

**Result:** **NOT READY FOR FEATURE SIGN-OFF.** Two confirmed financial-display defects affect the forecast and category spending. Read failures can look like valid empty/zero results, mutation failures are hidden, and measured synchronous reads exceed the 8.3–16.6 ms frame budget at scale. No ledger corruption or duplicate posting was demonstrated by this audit.

**Changes made:** CAL-F01 forecast sign handling is fixed with `calculateProjectedMonthEndNet` and `calendar-forecast.test.cjs` regression coverage. CAL-F02 category refund netting is fixed with signed parent direction in `buildCategoryExpenseBreakdown` and `category-expense-breakdown.test.cjs` regressions. CAL-F03 query failure recovery is fixed with error tracking, retry callbacks, and `PageErrorState` integration in `calendar-screen.tsx` and `calendar-recovery.test.cjs` regressions. CAL-F04 mutation feedback is fixed with pending and error state forwarding, modal retention on failure, and error clearing on dismissal in `calendar-screen.tsx` and `use-calendar-data.ts`, covered by `calendar-mutation-feedback.test.cjs` regressions. CAL-F05 failed occurrence state is fixed with an explicit Failed badge, failure error message display, and Retry/Skip recovery actions in `CalendarSchedulesTab`, covered by `calendar-failed-occurrences.test.cjs` regressions. CAL-F06 query scheduling and mutation ownership is fixed with deferred non-blocking initial month load, after-paint FX and schedule preview queries, closed-form preset gating, 200ms mutation coalescing, and offscreen focus gating in `use-calendar-data.ts` and `calendar-screen.tsx`, covered by `calendar-query-scheduling.test.cjs` regressions. CAL-F07 month rendering and cache bounds is fixed with an LRU month cache (`MAX_CALENDAR_CACHED_MONTHS = 4`) in `calendar-cache.ts` and `use-calendar-data.ts`, `React.memo` wrapping on `CalendarTransactionsTab` and `CalendarSchedulesTab`, and stable action callbacks in `calendar-screen.tsx`, covered by `calendar-cache-bounds.test.cjs` regressions. Production code, tests, migrations, application versions, and release notes are unchanged beyond this scoped remediation. Release notes skipped as requested. No commit was created.

## 1. Prior audits and workflow

This review follows the inventory, ownership, action review, independent fixtures, prioritized findings, performance assessment, and staged sign-off format used in the existing eight audits:

| Existing audit | Relevant evidence or decision carried forward |
| --- | --- |
| [Transactions](transactions-audit-v1.8.0.md) | Signed ledger amounts, net refunds, transfer/fee grouping, public services, and atomic writes. Calendar must preserve these guarantees when presenting results. |
| [Accounts](accounts-audit-v1.8.0.md) | Derived balances, pockets, opening-date cutoffs, currency protections, and intentional Fund Group overlap. A signed-off account screen does not prove the separate historical balance-sheet path is bounded. |
| [Dashboard](dashboard-audit-v1.8.0.md) | Summary/detail parity, deferred reads, responsive recovery, and intentional unmasked detailed inspection. Revalidate current source rather than inherit old FPS claims. |
| [Categories](categories-audit-v1.8.0.md) | Category lifecycle, metadata, localization, and explicit distinction between automated evidence, user-reported manual checks, and unmeasured device performance. |
| [Budgets](budgets-audit-v1.8.0.md) | Signed refund netting, exact date/currency scope, input responsiveness, and existing rollover/privacy policies. |
| [Credit Cards](credit-cards-audit-v1.8.0.md) | Signed liabilities, payments, external mutation refresh, bounded reads, and the detailed-inspection privacy exception. |
| [Scheduled Transactions](scheduled-transactions-audit-v1.8.0.md) | ST-F01–F08 remediation, occurrence identity, manual retry of failed postings, date-window occurrence reads, and consciously deferred template/catch-up scale work. |
| [Google Drive Backup](google-drive-backup-audit-v1.8.0.md) | Offline writes and later background sync remain separate. The accepted single canonical Quick Sync file is outside this calendar review. |

Their sign-offs do not establish Calendar correctness. Existing privacy decisions and consciously deferred schedule-engine work are not reopened as new bugs here.

| Stage | Status |
| --- | --- |
| 1. Audit Calendar | Complete: source trace, ownership, action inventory, financial probes, query plans, and scale samples. |
| 2. Validate Calendar | Partial: 24 existing tests pass; temporary execution probes confirm the defects below. Durable Calendar regressions remain to be added. |
| 3. Review findings and policies | Pending. |
| 4. Remediate findings | Not started. |
| 5. Feature sign-off | Not ready; native interaction and release-device profiling also remain pending. |

### Evidence and limits

- Read the required [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and the repository `AGENTS.md`.
- `node --test --test-reporter=spec src/modules/calendar/__tests__/*.test.cjs src/modules/scheduled-transactions/__tests__/get-calendar-schedules-remediation.test.cjs src/modules/transactions/__tests__/category-expense-refunds.test.cjs`: **12 passed**, no failures/skips.
- `node --test --test-reporter=spec src/modules/dashboard/__tests__/category-spending.test.cjs src/modules/transactions/__tests__/account-balance-deltas.test.cjs src/modules/scheduled-transactions/__tests__/recurrence.test.cjs`: **12 passed**, no failures/skips. Counts refer to tests actually reported by the runner.
- `npx tsc --noEmit`: **passed, exit 0**.
- Temporary hook probes transpiled the actual `use-calendar-data.ts`, category breakdown helper, and date utilities. A deterministic hook driver supplied stable accounts/categories, identity PHP conversion, service results, errors, event listeners, and deferred callbacks. These establish calculation and scheduling behavior, not React Native rendering or device FPS.
- Temporary callback probes executed the actual post/skip confirmation callbacks extracted from the screen, with services returning `false`.
- Actual-service SQL probes reused the existing scheduled-transactions test harness, all journaled migrations, Drizzle's Expo SQLite adapter, and in-memory Node SQLite. They captured executed SQL and ran `EXPLAIN QUERY PLAN`. Timing samples exclude seeding and follow one warm-up; they are host observations, not native benchmarks or statistical latency estimates.
- Temporary probes were kept outside the repository. No durable new regression suite was added during this review.
- No phone/emulator session, release APK, notification delivery, or React Native DevTools profiling was performed. Sustained **60–120fps is not verified**.

## 2. What Calendar should guarantee

1. Day and month totals reflect the local signed ledger, with transfers excluded from cashflow and standalone fees counted once.
2. Refunds reduce category spending; split totals follow the parent transaction's direction without counting the parent twice.
3. A forecast adds each recorded non-transfer amount once and adds each eligible pending signed amount once. A pending ordinary bill lowers the forecast.
4. Selecting a day scopes transactions and schedules to that local date. Balance Sheet uses the selected day's end or the active month's end.
5. Historical assets plus signed liabilities equal net worth. Pocket allocations explain an account balance without adding the allocation a second time.
6. Query errors are distinguishable from empty data. Failed writes preserve a usable action and show an error.
7. A local committed write refreshes affected Calendar data once without waiting for network sync.
8. The shell paints before expensive work. SQL bounds, cancellation, skeletons, and stable row props protect navigation and scrolling.
9. Visible copy and accessibility labels work in English, Filipino, and Spanish. Header/action targets meet the project minimum.

## 3. Ownership map

| Layer | Current responsibility |
| --- | --- |
| [Route](../../src/app/calendar.tsx) and [public entry](../../src/modules/calendar/index.ts) | Thin route adapter and deferred screen export; no route SQL or business logic. |
| [CalendarScreen](../../src/modules/calendar/screens/calendar-screen.tsx) | Month/day/tab presentation, transaction details/editing/deletion, schedule confirmations, walkthrough, ads, and Pro gates. |
| [useCalendarData](../../src/modules/calendar/hooks/use-calendar-data.ts) | Month cache and reads, dependencies, currency conversion, grid/scope/summary calculations, lazy balance-sheet load, and schedule actions. |
| [Calendar transaction service](../../src/modules/transactions/services/get-calendar-month-transactions.service.ts) | Public Transactions capability; calls `listTransactions` with a grid date window and `includeBalances: false`. |
| [Transactions repository](../../src/modules/transactions/repositories/transactions.repository.ts) | Date-filtered SQL, transfer grouping, fee metadata, attachments, labels, and split hydration. |
| [Calendar schedule service](../../src/modules/scheduled-transactions/services/get-calendar-schedules.service.ts) | Public Scheduled Transactions capability; recorded date-window rows plus active projections. |
| [Schedule hook](../../src/modules/scheduled-transactions/hooks/use-scheduled-transactions.ts) | Templates, actionable occurrence page, catch-up request, post/skip mutations, pending/error state. Calendar currently mounts its full default mode. |
| [Balance-sheet service](../../src/modules/accounts/services/get-balance-sheet.service.ts) | Accounts owns historical account/pocket balances and currency conversion. Calendar consumes its public API. |
| Calendar components/utilities | Grid, month controls, scope badge, ribbon, four tabs, local date helpers, and category breakdown presentation. |

No direct SQLite/Drizzle statement or cross-module repository import was found inside Calendar. Mutations reuse owning modules' hooks/services. Keep those boundaries during remediation; Calendar does not need its own ledger or a new repository merely for symmetry.

## 4. Action-by-action review

| Action | Execution and assessment |
| --- | --- |
| Open Calendar | Month transactions load synchronously in a state initializer. Categories/accounts/schedules and presets add independent work. The outer skeleton cannot precede the initial transaction read. CAL-F06. |
| Previous/next month, Today | Clears day selection; misses load after paint with cancellation. Cached month arrays are reused. Month SQL is date-windowed, but all matching rows are hydrated before display slicing. CAL-F07. |
| Select/clear a day | Uses local date keys and existing rows; ordinary transaction day selection does not issue a fresh transaction query. Selecting a padding cell changes the active month. |
| Transactions tab / load more | Groups by date and reveals 50 more already-loaded records; single-day views also have a load-more button. This is display expansion, not SQL pagination or native list virtualization. |
| Inspect/edit/delete | Shared Transactions UI and mutation services are reused. Failure state is not forwarded; successful writes cause an event-driven month read plus explicit `refreshAll`. CAL-F04/F06. |
| Schedules tab | Shows recorded/projected occurrences for the active month. Failed records fall through to an Upcoming badge. CAL-F05. |
| Post/skip occurrence | Calls owning service through the schedule hook. Both confirmation callbacks close regardless of success, and Calendar discards the hook's error. CAL-F04. |
| Net tab | Converts totals to the selected home currency. Forecast and category breakdown have confirmed sign defects. CAL-F01/F02. |
| Balance Sheet tab | Correctly starts its heavy service only when selected and cancels pending scheduled callbacks on dependency changes. However, it hydrates historical ledger rows, and its ribbon sits outside the tab loading guard. CAL-F08/F10. |
| Switch locale/privacy/Pro | Calendar amounts generally use existing privacy helpers. Core calendar labels remain English. Pro gates cover tab content, while grid/ribbon are outside those gates; intended preview scope needs a product decision. |
| Walkthrough / app resume | Calendar does not add a root route subscription. The intro's current default `autoTrigger: false` makes its waiting blocker inactive on this call path; the old Dashboard touch-deadlock finding is not reproduced here. |

## 5. Independent reproducible checks

All example amounts below are PHP; probe calculations use integer minor units and identity conversion.

| Fixture | Expected | Observed from production calculation/callback |
| --- | --- | --- |
| Food expense -100, Food refund +20, salary +200; no pending schedules | Net +120, forecast +120, category spending 80 | Net **+120**, forecast **+140**, category spending **120**. |
| Same ledger plus pending ordinary bill -50 | Forecast +70 | Forecast **+190**: refund double-counting adds 20, and subtracting the negative bill adds 50 instead of deducting it. |
| First month query throws; dependent hooks otherwise ready | Error and Retry, distinct from a successful empty month | `loading: false`, zero rows, no returned error. |
| Balance-sheet query throws on first selection | Error and Retry | Tab finishes loading and shows the initial zero balance result. |
| Select Balance Sheet before deferred query resolves | Ribbon and body both pending for the requested cutoff | `isTabLoading: true` while ribbon metrics expose initial zero values. After an earlier success they expose the previous snapshot until replacement. |
| Post/skip service returns false | Confirmation remains usable with failure feedback | Both actual screen callbacks clear their confirmation IDs. |
| Transaction mutation event followed by the screen's success refresh | One coalesced month reload | **Two** synchronous month service calls. |

These are display/recovery defects. The probe services supplied transaction and schedule rows; this does not demonstrate a bad ledger write. Real SQL/service scale measurements appear in Section 8.

## 6. Prioritized findings and mandatory pre-change answers

P1 = materially incorrect financial information; P2 = recovery, refresh, performance, or localization; P3 = interaction polish. Every finding is open. Proposed directions are scoped remediation guidance, not implemented fixes.

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| CAL-F01 | P1 — FIXED | Forecast counts refund/reversal rows twice and adds ordinary pending bills | Fixed with calculateProjectedMonthEndNet and calendar-forecast.test.cjs regression suite. |
| CAL-F02 | P1 — FIXED | Top Expense Categories adds refunds to spending | Fixed with signed parent netting in buildCategoryExpenseBreakdown and category-expense-breakdown.test.cjs regressions. |
| CAL-F03 | P2 — FIXED | Read failures become empty/zero success with no recovery | Fixed with error and retry handling in useCalendarData, PageErrorState in CalendarScreen, and calendar-recovery.test.cjs regressions. |
| CAL-F04 | P2 — FIXED | Failed post/skip/edit/delete actions lack error feedback | Fixed with pending and error state forwarding, modal retention on failure, and calendar-mutation-feedback.test.cjs regressions. |
| CAL-F05 | P2 — FIXED | Failed schedule occurrences display as Upcoming | Fixed with explicit Failed badge, errorMessage display, and Retry/Skip recovery actions in CalendarSchedulesTab, covered by calendar-failed-occurrences.test.cjs. |
| CAL-F06 | P2 — FIXED | Render-time reads, eager supporting queries, and duplicate mutation refresh | Fixed with deferred queries, preset gating, mutation coalescing, and offscreen focus gating, covered by calendar-query-scheduling.test.cjs. |
| CAL-F07 | P2 — FIXED | Display slicing retains full month hydration and an unlimited month cache | Fixed with LRU cache bounds (capacity 4), React.memo tabs, and stable callbacks in calendar-screen.tsx, covered by calendar-cache-bounds.test.cjs. |
| CAL-F08 | P2 | One historical balance sheet hydrates ledger history into JS | Actual SQL: 10,000 ledger rows for a single cutoff. |
| CAL-F09 | P2 | Date-window schedule SQL still scans all occurrence history | Actual query plan: full scan and temporary ordering B-tree. |
| CAL-F10 | P2 | Balance-sheet ribbon shows stale/zero figures under the new scope while loading | Actual hook state plus screen render order. |
| CAL-F11 | P2 | Core calendar UI/date/accessibility copy remains English | Components use hardcoded text and English date arrays. |
| CAL-F12 | P3 | Month navigation and small schedule actions miss minimum touch targets | Explicit 36×36 month buttons and compact Post/Skip styles without hit slop. |

### CAL-F01 — Forecast sign handling

1. **Actual problem:** Section 5's +120 actual net becomes a +140 forecast with no pending items. Adding a -50 bill produces +190 instead of +70.
2. **Cause/path:** `useCalendarData` → `projectedMonthEndNet`, [lines 454 onward](../../src/modules/calendar/hooks/use-calendar-data.ts#L454). Two independent actual-row `if` statements both accept a positive expense refund or a negative income reversal. Pending expenses are accumulated with their stored signed amounts and then subtracted. Schedule saving preserves the submitted non-transfer sign; ordinary expense schedules are negative.
3. **Smallest fix:** Sum each eligible recorded non-transfer signed amount once, and add each eligible pending non-transfer signed amount once. Reuse the scoped period/currency conversion. Extracted pure calculation `calculateProjectedMonthEndNet` in [calendar-forecast.ts](../../src/modules/calendar/utils/calendar-forecast.ts) and consumed in [use-calendar-data.ts](../../src/modules/calendar/hooks/use-calendar-data.ts).
4. **Regression proof:** Actual hook/service fixtures for ordinary income/expense, positive expense refunds, negative income reversals, mixed-currency schedules, due/upcoming versus posted/skipped/failed, and transfer/fee exclusions. With no eligible pending items, forecast strictly equals the same month's actual net. Permanent regressions implemented in [calendar-forecast.test.cjs](../../src/modules/calendar/__tests__/calendar-forecast.test.cjs).

### CAL-F02 — Category refund netting

1. **Actual problem:** -100 expense plus +20 refund displays 120 spent instead of 80. Refund-only categories become positive spending.
2. **Cause/path:** Net tab → `buildCategoryExpenseBreakdown` → [absolute conversion at line 24](../../src/modules/calendar/utils/category-expense-breakdown.ts#L24). Every row/entry adds an absolute magnitude. Split entry magnitudes also need the parent transaction's direction.
3. **Smallest fix:** Net spending using the parent's signed direction; allocate split magnitudes consistently without also adding the parent. Preserve category metadata, date scope, FX rounding, and negative net spending. Set percentage presentation deliberately when totals are zero/negative; do not disguise a refund as a positive expense. Implemented in [category-expense-breakdown.ts](../../src/modules/calendar/utils/category-expense-breakdown.ts).
4. **Regression proof:** Execute the actual helper with unsplit/split refunds, refund-only and net-negative categories, fees, deleted rows, nested category metadata, and currencies. Compare amounts to the owning Transactions expense aggregation. Permanent regressions implemented in [category-expense-breakdown.test.cjs](../../src/modules/calendar/__tests__/category-expense-breakdown.test.cjs) and verified against [category-spending.test.cjs](../../src/modules/dashboard/__tests__/category-spending.test.cjs).

### CAL-F03 — Query failure recovery

1. **Actual problem:** A failed initial month read is indistinguishable from no transactions; a failed balance-sheet read can display zero or a previous cutoff's data. Accounts/categories/schedule errors are also discarded by Calendar.
2. **Cause/path:** Initializer catches to `[]`; month reload logs only; schedule projection catches to `[]`; balance-sheet catch marks the target key loaded. [use-calendar-data.ts](../../src/modules/calendar/hooks/use-calendar-data.ts#L74) returns no error/retry state. The screen presents normal content after loading ends.
3. **Smallest fix:** Track scoped errors and successful result keys, forward dependent load failures, and wire existing error/retry UI to the failed operation. Do not mark a failed target successfully resolved. Implemented with `error`, `monthError`, `balanceSheetError`, `retryBalanceSheet`, and `refreshAll` in [use-calendar-data.ts](../../src/modules/calendar/hooks/use-calendar-data.ts) and wired to `PageErrorState` in [calendar-screen.tsx](../../src/modules/calendar/screens/calendar-screen.tsx).
4. **Regression proof:** Inject failures independently for initial/month navigation, projection, balances, and supporting catalogs. Retry must clear the error, fetch the same requested scope, and avoid presenting a failed query as an empty result. Rapid scope changes must not publish obsolete failures. Permanent regressions implemented in [calendar-recovery.test.cjs](../../src/modules/calendar/__tests__/calendar-recovery.test.cjs).

### CAL-F04 — Mutation feedback

1. **Actual problem:** Failed post/skip closes the dialog with no explanation. Failed edits/deletes receive no useful service error in Calendar's shared form/confirmation.
2. **Cause/path:** [Post/skip handlers](../../src/modules/calendar/screens/calendar-screen.tsx#L242) ignore the boolean result and always clear IDs. `useCalendarData` discards schedule `pending/error`; the screen discards `useTransactions.error`. Existing `TransactionFormModal` and `ConfirmModal` accept `error`, but Calendar supplies none.
3. **Smallest fix:** Expose/forward pending and error state, close schedule confirmations only on success, and clear action-specific errors on dismissal/retry. Reuse existing dialogs and owning mutation services. Implemented in [use-calendar-data.ts](../../src/modules/calendar/hooks/use-calendar-data.ts) by exposing `schedulesPendingAction`, `schedulesError`, and `clearSchedulesError`, and in [calendar-screen.tsx](../../src/modules/calendar/screens/calendar-screen.tsx) by wiring `error`/`onClearError`/`pending` to `ConfirmModal` (Delete, Post, Skip) and `TransactionFormModal`, keeping dialogs open on mutation failure, and preventing action errors from crashing the background calendar view.
4. **Regression proof:** Inject posting, skipping, transaction update, transfer update, and delete failures. Assert visible feedback, preserved edit draft/action identity, successful retry, correct pending controls, and no duplicate successful commit. Permanent regressions implemented in [calendar-mutation-feedback.test.cjs](../../src/modules/calendar/__tests__/calendar-mutation-feedback.test.cjs).

### CAL-F05 — Failed occurrence state

1. **Actual problem:** A persisted failed occurrence is labeled Upcoming and has neither Post nor Skip in Calendar.
2. **Cause/path:** [renderStatusBadge](../../src/modules/calendar/components/calendar-schedules-tab.tsx#L221) defaults to Upcoming and branches only for due/posted/skipped. Actions at line 178 accept only `due`. The owning domain explicitly includes `failed`; the previous schedule audit accepts manual retry as its recovery policy.
3. **Smallest fix:** Render an explicit Failed badge state, expose failure errorMessage, and enable Retry and Skip action buttons for failed occurrences using the existing post/skip occurrence flow. Implemented in [calendar-schedules-tab.tsx](../../src/modules/calendar/components/calendar-schedules-tab.tsx) and [get-calendar-schedules.service.ts](../../src/modules/scheduled-transactions/services/get-calendar-schedules.service.ts).
4. **Regression proof:** Render all five calendar statuses (due, failed, posted, skipped, projected upcoming). Failed is verified to produce the Failed badge and Retry/Skip buttons; posted, skipped, and projected upcoming rows are non-actionable. Permanent regressions implemented in [calendar-failed-occurrences.test.cjs](../../src/modules/calendar/__tests__/calendar-failed-occurrences.test.cjs).

### CAL-F06 — Query scheduling and mutation ownership

1. **Actual problem:** Initial month work blocks the first shell render. Calendar performs schedule/FX reads in render, eagerly loads closed-form presets, and reloads month rows twice after its own writes. Mounted offscreen Calendar listeners also reload immediately on transaction events.
2. **Cause/path:** State initializer at [line 74](../../src/modules/calendar/hooks/use-calendar-data.ts#L74); exchange-rate and projection `useMemo` bodies; default `useScheduledTransactions()`; [eager presets](../../src/modules/calendar/screens/calendar-screen.tsx#L121). Presets refresh both on mount and focus; Accounts schedules both paths, although its cancellation may coalesce pending work. The always-mounted Calendar event listener reloads synchronously; Transactions emits after save/delete, then the screen calls `refreshAll` again.
3. **Smallest fix:** Move actual reads into a cancellable, focus-owned deferred pipeline and publish data/loading together. Gate presets/form-only reads with existing options and visibility. Separate month schedule preview needs from full management-hook reads using existing capabilities where sufficient. Choose one coalesced month invalidation owner for committed writes, with source identity or equivalent deduplication. Keep existing background catch-up ownership intact. Implemented with deferred initial load and after-paint FX/schedules in [use-calendar-data.ts](../../src/modules/calendar/hooks/use-calendar-data.ts), `readOnly: true` schedule hook preview, 200ms mutation coalescing, offscreen focus gating via `useFocusEffect`, and `skipQuery: !formModalOpen` in [calendar-screen.tsx](../../src/modules/calendar/screens/calendar-screen.tsx).
4. **Regression proof:** Zero month/projection/FX DB reads during render; zero closed-form preset queries; one month refresh per successful own/external mutation burst; no offscreen eager month query; cancellation on blur/unmount/scope change; authoritative posting checks remain unchanged. Permanent regressions implemented in [calendar-query-scheduling.test.cjs](../../src/modules/calendar/__tests__/calendar-query-scheduling.test.cjs).

### CAL-F07 — Month hydration, rendering, and cache bounds

1. **Actual problem:** A 50-row initial view still hydrates the whole date window. Ten thousand matching rows require 61 statements and roughly 621 ms in the host sample. Each visited month remains cached until a mutation/refresh clears the map; display expansion keeps all revealed native rows mounted.
2. **Cause/path:** [getCalendarMonthTransactions](../../src/modules/transactions/services/get-calendar-month-transactions.service.ts#L10) calls unpaginated `listTransactions`; [display slicing](../../src/modules/calendar/components/calendar-transactions-tab.tsx#L45) happens after hydration. `monthCacheRef` has no capacity/eviction rule. The parent is a scroll view, and screen handlers passed to memoized transaction rows are recreated on renders.
3. **Smallest fix:** Bound cached months using an LRU eviction policy (`MAX_CALENDAR_CACHED_MONTHS = 4`) with recency promotion on hits in [calendar-cache.ts](../../src/modules/calendar/utils/calendar-cache.ts) and [use-calendar-data.ts](../../src/modules/calendar/hooks/use-calendar-data.ts). Memoize tab components (`CalendarTransactionsTab`, `CalendarSchedulesTab`) with `React.memo` and provide stable transaction action callbacks (`handleInspectTransaction`, `handleCloseInspectTransaction`, `handleEditTransaction`, `handleDeleteTransaction`, `handleNavigateToSchedules`, `handlePostOccurrence`, `handleSkipOccurrence`) in [calendar-screen.tsx](../../src/modules/calendar/screens/calendar-screen.tsx), preserving `React.memo` on `<TransactionRow>` and preventing full list re-renders during windowed scroll frames.
4. **Regression proof:** Bounded cache size of 4 months verified with oldest-entry eviction, hit recency promotion, cache update, and clear invalidation in [calendar-cache-bounds.test.cjs](../../src/modules/calendar/__tests__/calendar-cache-bounds.test.cjs).

### CAL-F08 — Historical balance-sheet work

1. **Actual problem:** A single selected-day/month-end snapshot brings historical ledger rows into JS. The measured 10k fixture reads 10,000 account deltas and takes about 76 ms despite only six SQL statements.
2. **Cause/path:** [getBalanceSheet](../../src/modules/accounts/services/get-balance-sheet.service.ts#L73) → `getAccountBalanceDeltasAtDate` → multi-cutoff helper → ordered per-transaction rows. The pocket helper reads all active pocket transaction rows, including dates after the cutoff, then filters in JS. Deferral paints a skeleton first but does not bound the synchronous execution.
3. **Smallest fix:** Keep Accounts as the owner and use a grouped single-cutoff account aggregate; add/reuse the corresponding cutoff-bounded pocket aggregate in Transactions. Preserve the separate multi-cutoff algorithm used by charts rather than rewriting it to fix one snapshot.
4. **Regression proof:** Actual migrated SQLite tests compare every account/type/pocket/available/asset/liability/net-worth field against the current baseline, including opening dates, transfers, fees, deleted rows, hidden/archived records, and currencies. Assert grouped result sizes rather than a constant statement count alone. Reports also consumes this service and needs parity checks.

### CAL-F09 — Schedule date-window query plan

1. **Actual problem:** Returned occurrence rows are bounded by dates, but lookup work still scans the full occurrence table and sorts it.
2. **Cause/path:** [listScheduleOccurrencesInDateWindow](../../src/modules/scheduled-transactions/repositories/scheduled-transactions.repository.ts#L308) filters a `COALESCE(effective_due_at, nominal_due_at)` expression and orders by nominal date. The migrated fixture's actual plan is `SCAN transaction_schedule_occurrences` plus `USE TEMP B-TREE FOR ORDER BY`.
3. **Smallest fix:** Make the effective-date/fallback lookup indexable and avoid redundant ordering if the service's final effective-date sort makes it unnecessary. Verify candidate SQL/index plans before generating a descriptive custom migration. This is a query-plan follow-up to ST-F05, not a claim that its old unbounded hydration still exists.
4. **Regression proof:** Real SQLite plans with substantial out-of-window history must use the intended range index without temporary SQL sorting. Verify null effective dates, weekend shifts across month boundaries, snapshots/statuses, and unchanged returned values. A one-statement assertion alone is insufficient.

### CAL-F10 — Snapshot/skeleton consistency

1. **Actual problem:** On balance-sheet entry/day/currency changes, the ribbon can show zero or the previous cutoff's figures under the newly selected date/currency while only the tab body displays a skeleton.
2. **Cause/path:** [CalendarSummaryRibbon](../../src/modules/calendar/screens/calendar-screen.tsx#L382) renders before the `isTabLoading` guard at line 403. The hook retains `balanceSheetData` while its deferred replacement runs. `triggerTabTransitionLoading` also ends on a separate after-paint callback rather than a resolved-data commit; the balance-specific pending flag protects the body, not the ribbon.
3. **Smallest fix:** Tie ribbon/body/scope metrics to the same successfully resolved snapshot identity and pending state. Preserve an interactive shell and mask pending metrics with the existing loading presentation; avoid artificial frame/timer completion for data loads.
4. **Regression proof:** First entry, day changes, rapid tab switches, currencies with different minor-unit exponents, errors, and cancelled reads. No old amount should appear as a new date/currency's result, and skeleton completion must accompany the matching snapshot.

### CAL-F11 — Localization

1. **Actual problem:** Switching to Filipino/Spanish leaves month/week/date names, summaries, tab labels, empty/loading states, confirmations, and accessibility labels in English.
2. **Cause/path:** Calendar components and [calendar-dates.ts](../../src/modules/calendar/utils/calendar-dates.ts) use literals/English arrays. The screen uses `t` mainly for walkthrough copy. Existing `calendar.*` keys cover only a few shared-picker actions.
3. **Smallest fix:** Reuse suitable existing keys, add missing keys to all three dictionaries, and use the existing locale-aware date formatting conventions. Preserve local date boundaries and user-created names.
4. **Regression proof:** Key parity plus component/date checks in en/fil/es, singular/plural counts, long translations, accessibility text, and month/day scopes. No English fallback for ordinary Calendar controls.

### CAL-F12 — Touch targets

1. **Actual problem:** Month arrow buttons are configured as 36×36 without hit slop. Schedule Post/Skip controls use 10px text and 3px vertical padding without a 44px minimum or hit slop.
2. **Cause/path:** [Month controls](../../src/modules/calendar/components/calendar-month-header.tsx#L127) and [schedule action styles](../../src/modules/calendar/components/calendar-schedules-tab.tsx#L359). The 48px-high calendar cells do not have this same explicit-height defect.
3. **Smallest fix:** Increase effective hit areas using existing target/hit-slop conventions, checking overlap between adjacent actions. Keep the visible design where possible.
4. **Regression proof:** Configured effective dimensions plus native taps on small screens/large text; Post and Skip must remain distinct and each activate once. Recheck shared modal one-tap keyboard dismissal in native smoke without assuming all modals query while closed.

## 7. Product questions and unconfirmed risks

These are separate from confirmed defects and do not justify new infrastructure by assumption.

| Topic | Current behavior / decision needed |
| --- | --- |
| Meaning of forecast | It is a monthly net cashflow calculation without opening balances. UI copy calls it a net cash position. Confirm wording; adding opening balances would change the metric. Fix CAL-F01 independently. |
| Pro preview | Grid/ribbon are outside tab Pro gates; selecting Balance Sheet still computes real data for non-Pro users. Confirm intended free-preview scope before changing entitlement behavior. |
| Schedule Total Due | Sums signed due/upcoming income, expense, and transfer magnitudes into one label. Decide whether this means gross bills payable, net pending cashflow, or all scheduled movement. Do not silently choose. |
| Padding dates | Transaction queries cover the visible grid; schedule preview queries cover only the active month. Adjacent-month cells can have transaction indicators but no schedule indicator until selected. Confirm desired consistency. |
| Failed forecasts | Failed occurrences are excluded from pending forecast/counts. Confirm whether a failed bill remains expected spending until skipped; showing it as Upcoming is independently wrong (CAL-F05). |
| Projection horizon | Projection starts at the schedule cursor and stops after 100 iterations. Far-future daily schedule months can be empty. The cap is carried from the accepted schedule design; seeking near the requested window is a future scoped improvement, not authorization to remove the bound. |
| Cache invalidation beyond ledger writes | Cache clears on transaction mutation/explicit refresh, not catalog changes themselves. Validate rename/color/currency metadata freshness on return to Calendar before declaring another defect. Database replacement remounts provider children using `databaseRevision`, so replacement staleness is not asserted here. |
| Privacy | Calendar summaries generally mask amounts already. Prior audits intentionally leave detailed transaction inspection visible; retain that decision. The Scheduled Transactions screen's separate visibility policy does not automatically change Calendar's masking. |

## 8. Runtime performance assessment — 60–120fps

**Frame budgets:** about 16.6 ms at 60Hz and 8.3 ms at 120Hz. A deferred synchronous query still occupies the JS thread once it runs. These measurements do not certify device FPS.

### Measured service work

One active PHP account, ordinary non-split expense rows, actual migrations, warm-up followed by one measured read:

| Path | Matching ledger rows | SQL statements | Hydrated month/history rows | Host synchronous time |
| --- | ---: | ---: | ---: | ---: |
| Month transactions | 1 | 4 | 1 | 6.23 ms |
| Month transactions | 1,000 | 7 | 1,000 | 47.46 ms |
| Month transactions | 10,000 | 61 | 10,000 | 620.81 ms |
| Balance Sheet, one cutoff | 10,000 | 6 | 10,000 account-delta rows; no pocket rows in fixture | 75.59 ms |

The month primary query correctly uses `transactions_active_feed_index` for the date range, with no temporary SQL sort in this fixture. Supporting attachment/label/split lookups scale in chunks; the statement increase is not a per-row-query claim. Passing `includeBalances: false` correctly avoids running-balance history hydration on the month path.

The schedule occurrence query instead produced:

```text
SCAN transaction_schedule_occurrences
USE TEMP B-TREE FOR ORDER BY
```

### Mount/focus work and complexity

- Initial Calendar mount executes **one month-service call before paint**. In the one-row real fixture that service is four statements; the hook probe also confirms projection/FX services can execute during render when dependencies are ready.
- Each projection invocation executes **two SQL statements**: all non-archived templates plus recorded occurrences in the date window. The hook can invoke it again as loading, transactions, schedules, or actionable occurrences change. This is not a single guaranteed mount query.
- Default schedule focus adds **three read statements** for templates, the 101-row actionable page, and IDs with postings; catch-up adds its probe and, when needed, the separately accepted staged-copy/posting work. Calendar should not duplicate management needs merely to obtain a preview.
- Accounts selection refresh loads account metadata, account deltas, pocket deltas, pockets, and types: **five statements** in the ordinary no-management/no-card-monitoring path. Its pocket delta path returns per-transaction pocket rows. Mount/focus cancellation may coalesce this work; do not claim both always execute.
- Presets load active and archived sets on both mount and focus; associated joins/hydration and preference initialization are additional work even with the form closed. Categories, currency settings, privacy, walkthrough, ads, and Pro also have their own paths. **No complete screen-wide statement count was measured**; the service counts above must not be presented as that count.
- Single-cutoff Balance Sheet adds **six statements** in the measured fixture whenever its selected dependencies refresh. Its SQL count is small while result volume is O(H), with H historical ledger rows.
- Month work is O(M) hydration plus up to O(M log M) grouping/sorting and metadata work, with M grid-window rows. Cache memory grows with the sum of visited month rows; the SQL date window avoids a full-ledger read but does not cap dense months.
- Schedule work is O(S + Hs + P log P) in the observed scan plan, with S templates, Hs stored occurrences scanned, and P returned/projected items; projection attempts are capped at 100 per active template. This includes accepted schedule scale limits, not a new assertion of unbounded returned history.
- Selecting a transaction day filters already indexed rows; no transaction SQL is needed. Selecting a balance-sheet day does need the historical snapshot load. No zero-query guarantee is claimed for the whole screen while other dependencies refresh.

### Re-renders, cancellation, and offscreen behavior

Calendar introduces no root provider context or root `usePathname` subscription. Its grid/day cells are memoized and style factories are at module scope. Deferred month/balance reads have cancellation; those are useful foundations.

Its transaction event listener remains registered while mounted, regardless of focus, and immediately performs synchronous work. Fresh screen callbacks defeat transaction-row memoization on unrelated screen renders. Schedule rows and expanded transaction groups are ordinary scroll-view children. No measured app-wide context re-render cascade is claimed; React Native profiling remains required.

### Device validation still required

Use a release build with 1k/10k+ ledger fixtures, dense single days, mixed currencies, transfers/fees, splits/refunds, long histories, and many schedule occurrences. Measure cold open, repeated month/day/tab changes, scroll/load-more, global-entry writes while Calendar is mounted offscreen, failed actions/retries, background/resume, and idle stability. Record JS/UI frame timing and row commits using Highlight Updates/Profiler. Verify interactive headers and native-driven skeletons on both 60Hz and 120Hz devices where available.

## 9. Data, offline behavior, and minimal remediation boundaries

Calendar owns no persistent financial tables. Transactions is the ledger authority; Scheduled Transactions owns templates/occurrence identity/posting; Accounts owns balance-sheet composition; Currencies owns rates/preferences. Calendar composes their public capabilities.

Editing/deleting/posting remains local and uses existing owning services. No direct network sync was found on the Calendar screen path. Keep the existing commit/rollback and post-commit event behavior; do not add a calendar balance table, another recurrence engine, or a separate sync queue.

Necessary supporting changes, if remediation proceeds, are bounded transaction detail/aggregate reads in Transactions, cutoff aggregates consumed through Accounts, and the occurrence lookup/index in Scheduled Transactions. Changes to those owners need their regression suites because Reports, Dashboard, and other consumers share capabilities. Keep all routes thin and all new source under `src/`.

## 10. Durable validation and remediation order

1. Add failing actual-code regressions for CAL-F01/F02, then repair forecast/category signs without changing ledger writes.
2. Add failure-injection/component checks for CAL-F03–F05 and CAL-F10; wire existing error/skeleton primitives and preserve action identity.
3. Add lifecycle/query-count tests for CAL-F06, including focused versus mounted-offscreen listeners, self-event deduplication, and closed forms.
4. Address CAL-F07–F09 with actual migrated SQLite parity/query-plan tests; maintain aggregate completeness while bounding detail hydration. Generate any index migration with a descriptive `--name` and verify the migration journal/manifest.
5. Localize CAL-F11 and adjust CAL-F12; perform native interaction/accessibility smoke.
6. Run new regressions, existing Calendar tests, the Dashboard category parity and Transactions refund/pagination/balance suites, Scheduled Transactions tests, Accounts/Reports consumers affected by snapshot changes, and `npx tsc --noEmit`.

Existing Calendar tests define local copies of date and balance-sheet calculations; they do not import the production hook or historical service. Their six passes are useful examples, not production regression proof. Existing Dashboard tests do execute the real Calendar category helper, but miss signed refund cases. Add focused coverage instead of rewriting unrelated test suites.

| Regression group | Required assertions |
| --- | --- |
| Local dates | Leap day, Dec/Jan, leading/trailing grid days, local midnight/end-of-day, DST zones, Today after a date change. |
| Money | Refunds/reversals, split parent direction, net-negative categories, mixed currency exponents/rounding, transfer/fee parity, forecast actual/pending reconciliation. |
| History | Opening-date boundaries, archived/hidden accounts/pockets, signed liabilities, future/deleted rows, field-by-field snapshot parity. |
| Lifecycle/recovery | First read failure, navigation failure, stale response cancellation, retry, no old snapshot under a new scope, no reads during render, no self-refresh duplication. |
| Actions | Post/skip/update/delete failure and retry, pending controls, unchanged atomic posting and event identity, failed status presentation. |
| Scale | Bounded detail rows and bind chunks, limited cache retention, index use, no temporary SQL ordering B-tree for optimized hot paths, release-device frame traces. |

Before each production fix, answer the four questions against its actual failing regression using Section 6. No new abstraction is justified merely by this report. Once behavior changes are implemented, update concise release notes in en/fil/es and ask whether to keep v1.8.0 or bump the appropriate version/Android version code. Documentation-only auditing does not trigger that bump.

## 11. Feature sign-off checklist

- [x] Read existing audits and project rules; map Calendar ownership and actions.
- [x] Run targeted existing tests and TypeScript checking.
- [x] Reproduce forecast/category/recovery issues with actual production calculations/callbacks.
- [x] Inspect actual migrated SQLite query plans and 1k/10k scale behavior.
- [x] Separate confirmed findings from product questions and accepted prior deferrals.
- [ ] Review findings/policy questions.
- [ ] Add durable failing regressions and remediate agreed findings.
- [ ] Validate affected shared consumers and rerun required checks.
- [ ] Complete native smoke, accessibility/localization checks, and release-device performance measurements.

**Current decision:** Calendar requires remediation and validation before sign-off. This audit adds no runtime work or production behavior changes.

## 12. Next feature to audit

**Recommendation: Reports**, after Calendar's financial calculations and shared snapshot fixes are validated.

Reports has no dedicated file among the existing audits and presents five high-trust financial views: Income/Expense, Cash Flow, Balance Sheet comparison, Net Worth Growth, and Labels Summary. It shares the exact signed amounts, category splits/refunds, FX conversion, date boundaries, and account history exposed by this review. Its [balance-sheet comparison service](../../src/modules/reports/services/get-balance-sheet-comparison.service.ts#L133) calls the same historical snapshot service twice, making CAL-F08 directly relevant. Some existing report tests define copied calculations; passing them must not substitute for actual-service/SQLite validation.

Suggested Reports scope:

1. Independently reconcile each report against the ledger using the same refund, split, transfer/fee, multi-currency, opening-balance, and historical fixtures as Calendar/Dashboard.
2. Verify filter dates, previous/current comparison alignment, sign and variance semantics, and any detail/export routes against the displayed result.
3. Audit chart gestures, large tables, lazy tab/Pro loading, error/retry states, privacy policy, localization, and accessible touch targets.
4. Measure statement counts, result volumes, plans, cancellation, re-renders, and release-device frame timing.

**Following candidates:** Subscriptions for its complete create/edit/pay/pause/archive/reminder lifecycle beyond the schedule integration already covered; then Data Import and Local Backup/Restore for bulk-write and recovery guarantees beyond the Drive-specific audit. This is a risk-based recommendation from current coverage, not a completed audit of those features.
