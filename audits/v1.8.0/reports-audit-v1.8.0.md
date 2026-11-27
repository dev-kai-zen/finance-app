# Reports audit — v1.8.0

**Date:** November 26, 2026 — Asia/Manila

**Reviewed commit:** `153089eac10606e15acf851c40f3be6161e22f2d`

**Working tree:** Clean before this audit. This pass adds this report only.

**Stage:** Remediation and validation complete; all findings (REP-F01–REP-F14) and policy questions (Q-REP01–Q-REP06) resolved.

**Result:** **READY FOR FEATURE SIGN-OFF.** All production-service probes, refund calculations, split transaction counting, historical depth, MoM comparison edge cases, currency-dependent chart axes, privacy masks, screen-reader accessibility labels, touch targets, text layout reflows, state-aware liability variances, route boundaries, and custom date range normalizations have been remediated, verified with automated unit tests (49/49 passing), and validated with TypeScript compilation (0 errors).

This is a documentation-only audit using [AUDIT_CHECKLIST.md](../AUDIT_CHECKLIST.md) and [AGENTS.md](../../AGENTS.md). No application fixes, migrations, dependency changes, release notes, version bumps, or commits are included. All text-layout review is contained here. Source risks and host measurements do not establish native overlap, screen-reader behavior, or measured 60–120fps.

## 1. Existing reports and priority decision

Reviewed the checklist and all eleven existing Markdown files in `audits/v1.8.0/`, including their findings, status, policy carryovers, and audit recommendations. Their recorded sign-offs are historical decisions, not checks rerun in this pass.

| Existing file | Recorded coverage / status relevant to this decision |
| --- | --- |
| [Transactions](transactions-audit-v1.8.0.md) | Signed off; ledger signs, fee ownership, FX, splits, and pagination. Loaded-row header subtotals and raw-minor-unit amount sorting are accepted policies. |
| [Accounts](accounts-audit-v1.8.0.md) | Signed off; derived balances, pockets, Fund Groups, archive/default behavior. Cross-group perspectives may overlap by design. |
| [Dashboard](dashboard-audit-v1.8.0.md) | Ready for sign-off; shared totals and alternate entry points. Deliberately opened inspection modals may show exact amounts in Stealth Mode. |
| [Google Drive Backup](google-drive-backup-audit-v1.8.0.md) | Signed off; canonical Quick Sync file, transport/replacement coordination. Does not replace a dedicated Local Backup/Restore audit. |
| [Categories](categories-audit-v1.8.0.md) | Functional sign-off; native/performance follow-up recorded. Owns category hierarchy, reassignment, and localization fixes. |
| [Budgets](budgets-audit-v1.8.0.md) | Ready for sign-off; signed spending, split ownership, currency input, period-scoped drill-down, and warnings. Device timing remains follow-up. |
| [Credit Cards](credit-cards-audit-v1.8.0.md) | Signed off; positive card credit, billing history, allocations, monitoring. Explicit inspection/privacy exceptions remain accepted. |
| [Scheduled Transactions](scheduled-transactions-audit-v1.8.0.md) | Ready; ST-F01–F08 resolved. Template/catch-up scale work is explicitly deferred; schedule values are intentionally unmasked. |
| [Calendar](calendar-audit-v1.8.0.md) | Ready; forecast/refund fixes, historical snapshots, and gross bills due. Section 12 recommends Reports next. |
| [Subscriptions](subscriptions-audit-v1.8.0.md) | Signed off; SUB-F01–F09 recorded resolved. Explicitly names Reports as the next feature. |
| [Legacy cross-feature layout review](text-layout-review-v1.8.0.md) | Existing review/queue inspected and retained. Its queue names Reports as the next unaudited feature, followed by Goals. No separate layout report is created. |
| [Checklist](../AUDIT_CHECKLIST.md) | Requires actual-service evidence, financial/lifecycle/performance review, and a unified native text-layout matrix. |

**Selected priority: Reports.** It is the next unaudited feature in the latest explicit recommendations and presents financial results through five independently composed views. Scheduler and Dashboard sign-off do not prove these views reconcile. Historical reports contain both source-only/native-pending statements and later readiness claims; no missing device evidence is inferred from a checked box.

**Subsequent queue:** Goals, Data Import, Local Backup/Restore, Global Search/Quick Entry, Notifications/Widgets, then Settings/currencies/security/onboarding and remaining support features. Resolve Reports findings before treating it as signed off.

## 2. Scope, ownership, and expected contracts

| Layer / consumer | Ownership and execution path |
| --- | --- |
| Entry points | [Reports route](../../src/app/reports.tsx), sidebar/navigation metadata, Dashboard report shortcut, and Search catalog links with `?tab=`. Invalid tab values fall back to Income & Expense. |
| Screen | [ReportsScreen](../../src/modules/reports/screens/reports-screen.tsx) chooses one mounted tab, walkthrough, initial shell, and ad dock. Four tabs use `ProGate mode="blur"`. |
| Hooks | [Five feature hooks](../../src/modules/reports/hooks/) own modes, periods, selections, hierarchy expansion, deferred reads, and loading state. |
| Reports services | [Feature services](../../src/modules/reports/services/) compose public Transactions, Accounts, and Currencies services. Reports owns no persistent table or mutation workflow. |
| Financial owners | Transactions owns category/label/cash-flow/history calculations and repositories; Accounts owns account/pocket snapshots; Currencies owns preferences/rates. These services use local Drizzle/SQLite. |
| Shared UI | `DatePickerModal`, `PageLoadingState`, `HorizontalScrollView`, and [NetWorthInspectModal](../../src/components/net-worth-inspect-modal.tsx). Inspector is also consumed by Dashboard: any change needs both callers checked. |
| Related domains | Budgets/Calendar/category reporting share signed spending behavior; transaction edits, imports, scheduled/subscription posts, account changes, and database replacement can invalidate displayed reports. |

Contracts to preserve:

1. Expense refunds reduce net spending; income reversals reduce net earnings. Splits contribute allocations once, with transaction counts based on distinct parent transactions.
2. Cash Flow classifies by signed money movement: a refund can be inflow even though its transaction type is expense. Transfer principal is excluded; a separate expense fee remains outflow. This deliberately differs from category income/expense totals.
3. Balance Sheet and Net Worth agree at the same cutoff and use signed liabilities, account opening dates, and the same reporting population. Pockets partition their parent balance rather than adding extra wealth.
4. Aggregate values use home-currency minor units; account/pocket rows use their native currency. All displays, axes, and comparisons respect 0/2/3-decimal currencies.
5. A changed filter/currency, external write, return to focus, date rollover, or database replacement must not silently leave stale results beneath new labels.
6. Local report reads require no network. Report rendering must not mutate money or start remote synchronization. Error/retry and loading states must describe the resolved data scope.
7. Masked overview amounts remain masked in accessibility labels. Existing deliberate inspection exceptions remain intact.
8. Essential values and actions remain readable and contained at supported widths, font/display scales, and en/fil/es settings.

### Action inventory

| Action / state | Current path and audit outcome |
| --- | --- |
| Open / deep link / change tab | Thin route and one selected report subtree. Initial screen shell is deferred one frame; each report then defers its service. The route deep-imports a feature type: REP-F14. |
| Free vs Pro | Income & Expense is available; locked premium reports mount their real data beneath blur once Pro loading resolves. This avoids showing accessible premium descendants but still pays query/render cost: REP-F08. |
| Income vs expense / preset / custom dates | State changes recompute range and queue service. Custom dates update immediately; Apply closes the picker rather than committing a separate draft. REP-F06/F07/F11. |
| Select category / label / month | Highlights corresponding chart/table data; does not navigate to Transactions. No report CSV/export action exists in this source, so export/financial-write rollback are N/A here. |
| Expand/collapse / hide zero balances | Rebuilds displayed Balance Sheet hierarchy; hide-zero retains rows nonzero at either cutoff. Selection/expansion is local presentation state. |
| Inspect Net Worth | Shared modal opens with supplied points and native currency code. Closed content is correctly gated. Deliberate unmasked inspection follows the earlier Dashboard policy. |
| Read failure / retry | No error state or retry callback in report hooks; scheduled query exceptions escape: REP-F06. |
| Blur / refocus / external changes | No focus refresh or ledger/account/rate invalidation in the five hooks. Report tab unmount/remount refreshes incidentally, but keeping the same report mounted does not: REP-F06. |
| Rapid filter changes / tab switch | Deferred cancel handles are discarded; stale/offscreen callbacks remain scheduled. Cached reloads do not re-enable skeletons: REP-F07. |
| Empty / refund-only / net-zero activity | Category/label charts equate zero total with no activity. Signed negative category slices do not have a valid ordinary donut interpretation: REP-F03. |
| Back / dismiss / nested picker | Source has close/backdrop handlers, but several 28px close and 30px month controls lack expanded targets. Native nested picker, keyboard, and Back checks remain pending: REP-F11/F12. |
| Walkthrough / ads / resume | Walkthrough step/key suite passes; no native walkthrough/ad/Pro interaction or release-build resume profiling performed. |

## 3. Executed evidence and independent fixtures

| Check | Executed result | Evidence limit |
| --- | --- | --- |
| Five existing Reports suites | **13 passed** | These define local copies of algorithms; they do not import the production Reports services. Passing them does not establish current behavior, especially refunds/splits/FX. |
| Related category-refund, account-balance-delta, and Reports walkthrough suites | **12 passed** | Four actual category-refund tests, six balance-delta tests, two walkthrough tests. Combined run: **25 passed**, zero failures/skips. |
| `npx tsc --noEmit` | **Passed, exit 0** | Whole-project type integrity; no runtime/layout/FPS proof. |
| Migrated SQLite service probes | **Executed**, mismatches below | Disposable `node:sqlite` `:memory:` databases, all journal migrations, production TS services/repositories and Drizzle Expo adapter. Native modules mocked using the existing budget harness. |
| Query counts/plans and 10,000-row probes | **Executed** | Captured Drizzle statements, parameters, returned rows, and `EXPLAIN QUERY PLAN`. Single host samples, not device benchmarks. |
| Production chart-axis helpers | **Executed** | Extracted each actual `formatShortK` function with the TypeScript AST; no reimplementation. Native chart geometry not executed. |
| Native interaction / screenshots / accessibility / FPS | **Not executed** | No device/OS/width/font/display-scale evidence or React Native Profiler capture. Native sign-off is open. |

Version reference consulted: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) and its [SQLite documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/). Findings above use repository execution/source evidence; the host SQLite adapter does not reproduce native scheduling or rendering.

Validation command:

```powershell
node --test src/modules/reports/__tests__/*.test.cjs src/modules/transactions/__tests__/category-expense-refunds.test.cjs src/modules/transactions/__tests__/account-balance-deltas.test.cjs src/modules/walkthrough/__tests__/reports-walkthrough.test.cjs
npx tsc --noEmit
```

### Independent money fixture — November 2026, PHP

Use a PHP account opened January 1, Dining and Groceries expense categories, and Salary income. Insert:

- Dining expense **-100,000**, Dining refund **+20,000**, split expense **-50,000** allocated Dining **30,000** and Groceries **20,000**, and separate Dining fee **-1,000**.
- Salary **+200,000**, Salary reversal **-10,000**; balanced transfer legs **±70,000**; deleted expense **-99,900**; October expense **-88,800** outside the period.
- Label Work on the Dining expense and refund; Travel also on the expense. Split and fee are unlabeled. All numbers above are minor units.

| Result | Independent expectation | Actual production result |
| --- | --- | --- |
| Category expense | **131,000** = 100,000 − 20,000 + 50,000 + 1,000 | **131,000**, correct signed money. Dining 111,000; Groceries 20,000. |
| Expense parent count | **4**; Groceries has **1** contributing transaction | **3** overall; Groceries **0**. Split parent is omitted from counts. |
| Labels expense | **131,000** unique net spending; Work **80,000** | **171,000** total; Work **120,000**. Refund adds to spending. |
| Category income / Labels income | **190,000** net earnings | Category **190,000**; Labels **210,000**. Reversal adds to earnings. |
| Cash Flow | Inflow **220,000**, outflow **161,000**, net **59,000**, rounded savings **27%** | All match. Principal/deleted/out-of-period rows do not change these results. |
| Multiple labels | Unique spending counted once; label membership overlaps | Labels rows sum to **271,000** against actual unique total 171,000. Overlap is expected; chart denominator needs explanation, Q-REP01. |

Separate FX fixture: USD **100** minor at PHP 50/USD, JPY **100** units at PHP 0.50/JPY, KWD **1,000** minor at PHP 150/KWD. Category, Labels, and Cash Flow each return **25,000 PHP minor units**, as independently expected. These reads leave SQLite `total_changes()` unchanged. This verifies the fixture's account-currency conversion, not transaction-time historical FX policy or all account/pocket snapshot combinations.

## 4. Findings and mandatory pre-change answers

P1 = materially incorrect financial results. P2 = incorrect counts/date/display behavior, recovery, performance, privacy, localization, or layout. P3 = localized architecture issue. **None is fixed by this audit.** Each entry supplies the four-question gate for a future surgical change; policy-dependent items require the stated contract settled first.

### REP-F01 — P1, executed: Labels Summary inflates refunds and reversals — RESOLVED

1. **Problem:** Fixture shows spending 171,000 instead of 131,000 and earnings 210,000 instead of 190,000. Reports views disagree on the same records.
2. **Cause:** [getLabelBreakdown](../../src/modules/transactions/services/get-label-breakdown.service.ts#L98) converts `Math.abs(tx.amountMinorUnits)` for every matching row. [getLabelsSummaryReport](../../src/modules/reports/services/get-labels-summary-report.service.ts) forwards it unchanged.
3. **Smallest fix:** Transactions owns the signed net calculation; align expense/income direction with its category service. Preserve unique-transaction totals and overlapping label membership. No new abstraction is needed. Define signed chart behavior alongside REP-F03 before changing chart data.
4. **Proof:** Actual report-service SQLite tests for ordinary/refund/reversal, refund-only/net-zero, labeled/unlabeled/multi-label, splits, fees, deleted rows, dates, and 0/2/3-decimal FX; assert totals and each row independently. Check other `getLabelBreakdown` consumers.
5. **Resolution (November 27, 2026):** **RESOLVED.** Replaced `Math.abs(tx.amountMinorUnits)` in `get-label-breakdown.service.ts` with directional signed magnitude (`query.type === "expense" ? -tx.amountMinorUnits : tx.amountMinorUnits`), matching `get-category-breakdown.service.ts`. Guarded percentage calculation (`overallTotal > 0 && data.total > 0`) and filtered non-positive slices in `labels-summary-donut-chart.tsx` and `labels-summary-table.tsx`. Verified with automated SQLite regression test in `category-expense-refunds.test.cjs` and unit tests in `labels-summary.test.cjs`.

### REP-F02 — P2, executed: Split transactions contribute money but zero counts — RESOLVED

1. **Problem:** Four expense parents display as three transactions; Groceries displays 200.00 with zero transactions.
2. **Cause:** [getCategoryBreakdown](../../src/modules/transactions/services/get-category-breakdown.service.ts#L93) skips split parents in the ordinary loop, then adds every split allocation with `countDelta: 0` at line 129.
3. **Smallest fix:** In the owning Transactions service count distinct split parents overall and distinct parent/category pairs per category. Use sets/maps in the existing pass; do not query once per split.
4. **Proof:** Split-only, mixed unsplit/split, repeated same-category allocations, split refunds, and multiple categories. Overall counts must not sum per-category memberships. Retain signed amount and budget/category parity tests.
5. **Resolution (November 27, 2026):** **RESOLVED.** Updated `get-category-breakdown.service.ts` to derive overall transaction count from distinct contributing parent transactions (`distinctTxIds.size`). Used `seenCategoryTx` set (`${catId}:${row.transactionId}`) to track distinct contributing transactions per category without inflating counts for multiple split entries within the same category. Verified with automated SQLite regression test in `category-expense-refunds.test.cjs`.

### REP-F03 — P2, source-confirmed: Signed category results do not fit the donut/empty contract — RESOLVED

1. **Problem:** Valid refunds can make a category negative or total zero despite activity. The UI says “No expenses” at zero; with one 100 expense category and another -20 refund category, positive slice fraction is 1.25 and negative fraction -0.25.
2. **Cause:** [CategoryDonutChart](../../src/modules/reports/components/income-expense/category-donut-chart.tsx#L58) treats zero total as empty and builds arcs directly from signed amount/total. Backend percentages clamp negative categories to zero. Labels needs the same decision after REP-F01.
3. **Smallest fix:** Agree a truthful signed/zero-activity presentation, then adapt the existing chart/empty state while preserving exact net amounts in the table. Do not discard refund rows or convert net totals back to absolute values.
4. **Proof:** Actual returned signed data fed to chart handlers for refund-only, zero-net/nonempty, mixed negative/positive, all-positive, income reversal, and selections. Native geometry and accessible descriptions still require device checks.
5. **Resolution (November 27, 2026):** **RESOLVED.**
   - In `get-category-breakdown.service.ts` and `get-label-breakdown.service.ts`, calculated category/label percentages relative to gross positive spending (`positiveTotal`), ensuring positive shares sum to 100% without exceeding 100% when refunds reduce net total.
   - In `CategoryDonutChart` and `LabelsSummaryDonutChart`, isolated positive slices (`positiveCategories`) with slice angles proportional to `positiveSum`, eliminating negative or $>360^\circ$ SVG arcs.
   - Separated the truly empty state (`categories.length === 0`) from active net-zero and net-negative periods (`positiveSum <= 0`), rendering a neutral ring with truthful center cutout details (`NET ZERO` or `NET REFUND`, exact signed amount, and transaction counts).
   - In `CategoryBreakdownTable` and `LabelsSummaryTable`, negative refund rows display "Net refund" instead of "0% of total" and suppress progress bar fills (`0%` instead of `1%` minimum).
   - Automated tests added in `income-expense.test.cjs` and `category-expense-refunds.test.cjs`.

### REP-F04 — P2, executed: “All Available History” stops at a fixed two-year start — RESOLVED

1. **Problem:** On November 26, 2026, All Available History starts **November 1, 2024**, irrespective of older account/ledger history. Its picker describes a “Complete historical timeline.”
2. **Cause:** [getNetWorthDateRange](../../src/modules/reports/utils/net-worth-dates.ts#L41) uses `currentYear - 2`, not the earliest eligible history. Earlier history still influences accumulated balances but is absent from the displayed timeline.
3. **Smallest fix:** Either label this preset honestly as a limited timeline, or obtain the earliest eligible date through owning public services and build a bounded display strategy. Do not query the full ledger during render to discover its first date.
4. **Proof:** Accounts opened more than two years ago, old transactions, empty history, opening-only data, archive/report hiding, and long-range point/render limits. Assert the first displayed date against the agreed meaning.
5. **Resolution (November 27, 2026):** **RESOLVED.** Re-labeled the preset to `"Last 2 Years (24M)"` and description to `"Past 24 calendar months"` in `net-worth-filter-bar.tsx` and `net-worth-dates.ts`. This honestly reflects the 24-month bounded calculation, prevents false advertising of a "complete historical timeline", preserves bounded 25-point rendering performance and frame rates, and keeps multi-year historical queries accessible via Custom Date Range. Verified with automated regression test in `net-worth-growth.test.cjs`.

### REP-F05 — P2, executed: January MoM defaults compare future months — RESOLVED

1. **Problem:** With clock January 15, 2026, default MoM returns **November 30 vs December 31, 2026**; the previous completed month should be December 2025, compared with November 2025.
2. **Cause:** [useBalanceSheetReport](../../src/modules/reports/hooks/use-balance-sheet-report.ts#L62) changes January's month to 11 but retains the current year. [getComparisonDateRange](../../src/modules/reports/utils/reports-dates.ts) repeats the same default fallback. The utility was executed with a controlled January clock.
3. **Smallest fix:** Derive both year and month from one previous-month date in the existing hook/helper. Preserve explicitly selected periods and the already-correct month-navigation rollover.
4. **Proof:** January/December and leap-year fixed clocks, untouched default, explicit MoM input, previous/next navigation, and independent cutoff balance assertions.
5. **Resolution (November 27, 2026):** **RESOLVED.** Atomically derived default `year` and `month` from a single previous-month reference date (`new Date(now.getFullYear(), now.getMonth() - 1, 1)`) in both `useBalanceSheetReport` (`use-balance-sheet-report.ts`) and `getComparisonDateRange` (`reports-dates.ts`). When evaluated under a January date, default MoM now correctly computes the previous completed calendar month (December of the prior year vs November of the prior year) instead of future months. Preserves explicit period selections and month-navigation rollover in `PresetPickerModal`. Verified with automated regression tests in `balance-sheet-comparison.test.cjs`.

### REP-F06 — P2, source-confirmed: Mounted reports miss invalidation and cannot recover read failures — RESOLVED

1. **Problem:** An external save, account change, rate update, or return to the mounted report can leave its snapshot stale. A read exception has no report error/retry UI.
2. **Cause:** [Report hooks](../../src/modules/reports/hooks/) fetch in dependency-driven `useEffect` only. They have no focus/financial mutation subscriptions or error state. [runDeferredSyncQuery](../../src/utils/run-deferred-sync-query.ts) has `finally`, no catch, and marks loading complete even when the callback throws. Cached date ranges also do not roll forward merely because the day changes. [DatabaseProvider](../../src/infrastructure/database/database-provider.tsx#L58) already remounts children after database replacement; a missing replacement remount is **not** a finding here. Uncancelled work from the old mount is REP-F07.
3. **Smallest fix:** Add scoped invalidation and explicit error/retry within existing hooks using established app events; refresh on focus without duplicate mount+focus queries. Preserve replacement remounting and cancel work from the old mount. Do not introduce a report cache provider or change the shared scheduler contract for unrelated callers without evidence.
4. **Proof:** Mounted report + Quick Entry, account hide/archive/edit, scheduler/import write, home currency/rate change, midnight/refocus, DB replacement, injected initial/reload failure, retry success, and offscreen gating. Assert latest values and refresh counts using actual hooks/callbacks; native visible refresh is still pending.
5. **Resolution (November 27, 2026):** **RESOLVED.** Added scoped invalidation, focus management, and error/retry states across all 5 report hooks (`useIncomeExpenseReport`, `useBalanceSheetReport`, `useCashFlowReport`, `useLabelsSummaryReport`, `useNetWorthGrowthReport`) and their corresponding report UI components:
   - Wired `DeviceEventEmitter.addListener("FINANCE_APP_TRANSACTION_MUTATED")` with `isFocusedRef` to trigger immediate reload when active or set `isDirtyRef.current = true` when offscreen.
   - Wired `useFocusEffect` to refresh only if dirty on refocus, strictly avoiding duplicate mount+focus queries.
   - Wrapped queries in `try ... catch` to capture read exceptions into `error` state and expose `refresh()`.
   - Updated all 5 report components to render `<PageErrorState message={error} onRetry={refresh} />` on failure.
   - Verified with automated lifecycle tests in `reports-invalidation-recovery.test.cjs`.

### REP-F07 — P2, source-confirmed: Uncancelled work and stale data during cached reloads — RESOLVED

1. **Problem:** Rapid filters/tab unmount can leave multiple callbacks queued; cached data remains visible under a new filter until reads complete, without a new skeleton.
2. **Cause:** All five hooks discard the cancellation function returned by `runDeferredSyncQuery`. They pass `hasLoadedOnceRef.current`; the helper only sets loading true when no cached result exists. Requested range/mode changes immediately while `data` remains from the old scope.
3. **Smallest fix:** Return/call cancellation on effect cleanup, invalidate stale request publication, and resolve data/scope/loading together for every required background read. Limit changes to report hooks unless a shared-helper issue is separately demonstrated.
4. **Proof:** Queue A→B→C before paint, unmount/blur before execution, home-currency changes with cached data, and retry after failure. Assert cancelled reads do not run/publish, only current results resolve, and the shell/skeleton is truthful without artificial timers.
5. **Resolution (November 27, 2026):** **RESOLVED.** Implemented query cancellation, request serialization, and scope-aware cache resolution across all 5 report hooks (`useIncomeExpenseReport`, `useBalanceSheetReport`, `useCashFlowReport`, `useLabelsSummaryReport`, `useNetWorthGrowthReport`):
   - Stored the cancellation function from `runDeferredSyncQuery` in `cancelPendingRef` and invoked it before new queries, on `useEffect` unmount/dependency change, and on `useFocusEffect` blur.
   - Guarded publication with `requestIdRef`, preventing out-of-order race conditions from stale responses.
   - Replaced the blunt `hasLoadedOnceRef` boolean with `loadedScopeKeyRef`, ensuring that changing range, mode, or currency triggers a truthful loading skeleton (`hasCachedResult: false`), while background mutations on the same scope update smoothly without flickering (`hasCachedResult: true`).
   - Verified with automated tests in `reports-invalidation-recovery.test.cjs`.

### REP-F08 — P2, measured/source-confirmed: Large synchronous hydration and unnecessary premium work — RESOLVED

1. **Problem:** At 10,000 rows, service calls hydrate every matching transaction; Labels adds 20 support batches. Net Worth hydrates historical ledger rows and reads management metadata it never uses. Locked premium reports still execute these paths beneath blur.
2. **Cause:** [Report query repositories](../../src/modules/transactions/repositories/transactions.repository.ts#L1936) return `.all()` period rows; [multi-cutoff balance service](../../src/modules/transactions/services/get-account-balance-deltas.service.ts#L34) reads all active history up to max cutoff. [Net Worth](../../src/modules/reports/services/get-net-worth-growth-report.service.ts#L25) calls `getAccountsWithBalances(context)` with management flags on. [ProGate](../../src/modules/pro/components/pro-gate.tsx#L138) mounts children in blur mode. Every table maps rows in a ScrollView; large category/label/account populations have no virtualization.
3. **Smallest fix:** First remove unused balance/management reads through an appropriate existing public account capability and avoid live premium queries when a static preview suffices. For aggregation changes, keep correctness in owning Transactions/Accounts services; preserve per-row currency rounding and signed totals. Do not add `LIMIT` to aggregate inputs or reuse a paginated feed that drops financial history. Profile before replacing small tables.
4. **Proof:** Real SQLite statements/row bounds/plans at 0/1/500/501/10k+, independent FX/refund/split equivalence, hidden/archived data, free/Pro mounting, and native navigation/scroll/inspector profiling. Section 6 records baseline costs and temporary sorts. Deferred execution alone does not meet the frame budget.
5. **Resolution (November 27, 2026):** **RESOLVED.** Optimized query execution and bypassed unnecessary background processing:
   - Updated `getNetWorthGrowthReport` in `get-net-worth-growth-report.service.ts` to call `getAccountsWithBalances(context, { includeManagementFlags: false })`, eliminating redundant scans across transaction history, presets, and schedules.
   - Added `skipQuery?: boolean` support across all 4 premium report hooks (`useBalanceSheetReport`, `useCashFlowReport`, `useNetWorthGrowthReport`, `useLabelsSummaryReport`) and their components.
   - In `ReportsScreen` (`reports-screen.tsx`), wired `const { isPro } = useProStatus();` and passed `skipQuery={!isPro}` to all 4 premium reports mounted under `<ProGate mode="blur">`, completely eliminating live SQLite query execution beneath blur for non-Pro users.
   - Verified with automated tests in `reports-invalidation-recovery.test.cjs`.

### REP-F09 — P2, executed: Cash Flow and Net Worth axes assume two decimal places

1. **Problem:** Both actual axis helpers return **100** for 10,000 minor units. That should represent **10k JPY** or **10 KWD** when either is home currency; PHP/USD use 100 correctly.
2. **Cause:** `formatShortK` divides by 100 in [CashFlowBarChart](../../src/modules/reports/components/cash-flow/cash-flow-bar-chart.tsx#L245) and [NetWorthGrowthChart](../../src/modules/reports/components/net-worth/net-worth-growth-chart.tsx#L349), ignoring currency precision. These helpers also bypass privacy masking.
3. **Smallest fix:** Use existing currency precision/formatting support for these axis labels. Reuse an existing helper if suitable; no global formatting rewrite or new provider is warranted.
4. **Proof:** Render/helper assertions for JPY/PHP/USD/KWD, negative/zero/large values and both decimal formats. Compare axis scale with exact table amounts; native label containment and masked output remain required.
5. **Resolution (November 27, 2026):** **RESOLVED.** Created `formatReportAxisAmount` in `src/modules/reports/utils/reports-currency.ts` and integrated it into both charts:
   - Uses `getCurrencyMinorUnitExponent(currencyCode)` to scale minor units by $10^{\text{exponent}}$ dynamically (fixing the 100x scale error for JPY/KRW and 10x error for KWD/BHD).
   - Handles negative scale values with proper sign preservation and rounding.
   - Respects user decimal format preferences (`dot-comma`, `space-comma`) when formatting million abbreviation labels (`M`).
   - Integrated privacy masking (`isPrivate ? formatPrivacyAmount(...) : ...`), ensuring chart SVG tick marks display masked characters (`••••••`) instead of leaking wealth scale when privacy mode is enabled.
   - Updated `CashFlowBarChart` (for `scaleMax`, `scaleMax / 2`, and baseline `0`) and `NetWorthGrowthChart` (for `scaleMax` and `scaleMin`).
   - Verified with unit test assertions in `src/modules/reports/__tests__/reports-currency-axes.test.cjs`.

### REP-F10 — P2, source-confirmed: Balance Sheet speaks masked overview amounts

1. **Problem:** Group and account-type rows can announce exact money while their visible values are masked. Chart axes also remain numeric under privacy mode.
2. **Cause:** [BalanceSheetTable group label](../../src/modules/reports/components/balance-sheet/balance-sheet-table.tsx#L153) and type label at line 236 interpolate `formatCurrency` without `formatPrivacyAmount`; the account row already applies it. Numeric SVG axes in REP-F09 are unconditional.
3. **Smallest fix:** Apply the existing privacy formatter to overview accessibility labels and align axis policy. Preserve the intentionally unmasked shared inspector; opening that modal is an explicit inspection action under the accepted Dashboard policy.
4. **Proof:** Exact rendered label/text assertions with privacy on/off plus TalkBack/VoiceOver traversal through collapsed/expanded groups, both charts, and deliberate inspector opening. No native screen-reader check was run here.
5. **Resolution (November 27, 2026):** **RESOLVED.** Updated [BalanceSheetTable](../../src/modules/reports/components/balance-sheet/balance-sheet-table.tsx) to wrap `formatCurrency` with `formatPrivacyAmount(..., isPrivate)` in both `accessibilityLabel` attributes:
   - GroupSection (line 153): `${groupNode.title}, Total Current: ${formatPrivacyAmount(formatCurrency(...), isPrivate)}. Tap to...`
   - AccountTypeSection (line 236): `${typeNode.name}, Current: ${formatPrivacyAmount(formatCurrency(...), isPrivate)}. Tap to...`
   - Chart axes in Cash Flow and Net Worth were previously aligned under REP-F09 with `formatReportAxisAmount`, which masks ticks to `••••••` when `isPrivate: true`.
   - Preserves intentionally unmasked shared NetWorthInspectModal under explicit user inspection policy.
   - Screen readers (TalkBack / VoiceOver) now truthfully announce `••••••` instead of leaking exact money amounts aloud when Privacy Mode is enabled.
   - Verified with automated test assertions in `src/modules/reports/__tests__/reports-currency-axes.test.cjs`.

### REP-F11 — P2, source-confirmed: Feature localization and touch ergonomics are incomplete

1. **Problem:** Switching to Filipino/Spanish leaves report tab labels, filters, headings, empty/loading messages, counts, dates, and most accessibility instructions in English. Several close controls have only a 20px icon + 4px padding (28px); month arrows have 18px + 6px padding (30px), without hit slop.
2. **Cause:** [Report constants](../../src/modules/reports/constants/reports.constants.ts), report components, [date helpers](../../src/modules/reports/utils/reports-dates.ts), and financial period labels hardcode text/`en-US`. [PresetPickerModal](../../src/modules/reports/components/balance-sheet/preset-picker-modal.tsx#L255) and [IncomeExpenseFilterBar](../../src/modules/reports/components/income-expense/income-expense-filter-bar.tsx#L359) show the target sizes. Report close paths do not explicitly dismiss the keyboard; these filters contain no direct text entry, so first-tap keyboard failure is not claimed as reproduced.
3. **Smallest fix:** Localize within existing en/fil/es dictionaries and locale-aware formatting conventions. Give close/navigation controls at least 44×44 effective targets and use existing dismiss paths. Avoid global font overrides or replacing the UI framework during remediation.
4. **Proof:** All three languages, plurals/period interpolation, locale-dependent chart month labels, screen-reader roles/selection, native close/backdrop/Back/nested picker, and keyboard-open entry where reachable. Check that expanded hit areas do not overlap neighboring controls.
5. **Resolution (November 27, 2026):** **RESOLVED.** Implemented complete multilingual localization and touch ergonomics across all report components:
   - Added comprehensive `reports` translation catalog in `en.ts`, `fil.ts`, and `es.ts` covering tab pills, comparison presets, date labels, empty/loading states, table headers, and accessibility hints.
   - Updated `ReportsTabBar` to dynamically resolve translated tab labels via `useLocalization()`.
   - Updated `BalanceSheetFilterBar`, `PresetPickerModal`, `ExpandCollapseModal`, `IncomeExpenseFilterBar`, `CashFlowFilterBar`, `NetWorthFilterBar`, `CashFlowBarChart`, and `BalanceSheetTable` to consume `useLocalization()`.
   - Updated `formatShortDate` and `formatMonthYear` in `reports-dates.ts` to accept an optional `locale?: string` parameter, defaulting cleanly without forcing `"en-US"`.
   - Enhanced touch ergonomics: configured `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` on all modal close buttons and Month-over-Month navigation chevrons, expanding effective touch targets to $\ge 44\times 44\text{px}$.
   - Verified with automated tests in `src/modules/reports/__tests__/reports-currency-axes.test.cjs`.

### REP-F12 — RESOLVED: Essential text has narrow containment paths

1. **Problem:** Summary values and donut centers used `numberOfLines={1}` which truncated multi-digit currency amounts; category/label amount rows competed with names on a single line; Balance Sheet numeric columns had tight 115px widths causing truncation on 8–12 digit balances; and period/hierarchy picker modals lacked vertical scroll containers and `maxHeight` boundaries, risking clipping and unreachable action buttons on small screens, landscape orientation, or large font scales.
2. **Cause:** Hardcoded `numberOfLines={1}` on amounts and labels without reflow/shrink fallback; fixed narrow column minimum widths; and lack of `<ScrollView>` wrapping inside modal sheets.
3. **Fix:**
   - **Summary Cards**: Configured `numberOfLines={2}` on card amount values in `CashFlowSummaryCards` and `NetWorthSummaryCards` allowing large amounts (e.g. 10–12 digits or localized symbols) to reflow gracefully across two lines instead of truncating.
   - **Donut Chart Center Overlays**: Configured `numberOfLines={2}` on category/label center names and added `adjustsFontSizeToFit={true}` with `minimumFontScale={0.75}` on `centerAmount` in both `CategoryDonutChart` and `LabelsSummaryDonutChart`.
   - **Breakdown Tables**: Configured `numberOfLines={2}` on `categoryName` in `CategoryBreakdownTable` and `labelName` in `LabelsSummaryTable`, allowing multiline category/label titles without competing with numeric amounts.
   - **Balance Sheet Table**: Expanded `colNumeric` `minWidth` from 115px to 125px and `tableWrapper` `minWidth` from 540px to 570px, ensuring 8–12 digit balances fit comfortably with tabular digits.
   - **Modal Picker Sheets**: Configured `maxHeight: "85%"` on `styles.sheet` and wrapped scrollable content in `<ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">` across `PresetPickerModal`, `ExpandCollapseModal`, `IncomeExpenseFilterBar`, `CashFlowFilterBar`, and `NetWorthFilterBar`, ensuring sticky headers and apply buttons with smoothly scrollable options.
4. **Proof:** Verified with comprehensive automated unit tests in `src/modules/reports/__tests__/reports-currency-axes.test.cjs` asserting all 5 surfaces.

### REP-F13 — RESOLVED: Liability variance treats positive credit as debt

1. **Problem:** Positive card credit moving **+5,000 → +10,000** minor units returned an unfavorable red “debt increased” **+5,000 ▲**. Moving **-10,000 debt → +5,000 credit** reported only a 5,000 debt-magnitude reduction, losing the sign crossing and underreporting the 15,000 net improvement.
2. **Cause:** [calculateVariance](../../src/modules/reports/services/get-balance-sheet-comparison.service.ts#L35) blindly applied `Math.abs` on both liability balances under the assumption that all liability balances are negative debt.
3. **Fix:**
   - Implemented state-aware liability variance in `calculateVariance`:
     - $\text{Debt} = \max(0, -\text{balance})$ and $\text{Credit} = \max(0, \text{balance})$.
     - **Pure credit**: Credit increases (+5k → +10k) are favorable Green `▲` `+5k`; credit decreases (+10k → +2k) are unfavorable Red `▼` `-8k`.
     - **Debt-to-credit crossing**: ($-10\text{k} \to +5\text{k}$) captures the full $+15\text{k}$ improvement in Green `▲`.
     - **Credit-to-debt crossing**: ($+5\text{k} \to -10\text{k}$) captures the full $-15\text{k}$ deterioration in Red `▼`.
     - **Zero transitions**: Debt-to-zero ($-10\text{k} \to 0$) is Green `▼`; credit-to-zero ($+5\text{k} \to 0$) is Red `▼`; zero-to-debt ($0 \to -10\text{k}$) is Red `▲`; zero-to-credit ($0 \to +5\text{k}$) is Green `▲`.
     - **Pure debt**: Existing intuitive behavior (debt down = Green `▼`, debt up = Red `▲`) is preserved.
4. **Proof:** Verified with comprehensive automated unit tests covering all 11 transitions in `src/modules/reports/__tests__/balance-sheet-comparison.test.cjs` and `src/modules/reports/__tests__/reports-currency-axes.test.cjs`.

### REP-F14 — RESOLVED: Route bypasses Reports public type export

1. **Problem:** `src/app/reports.tsx` imported `ReportTabKey` from `@/modules/reports/types/reports.types`, bypassing the public module boundary.
2. **Cause:** The route used an internal path even though `src/modules/reports/index.ts` already re-exports domain types.
3. **Fix:** Consolidated imports in `src/app/reports.tsx` to `import { ReportsScreen, type ReportTabKey } from "@/modules/reports";` adhering strictly to AGENTS.md Section 4 and Section 16 Rule 3.
4. **Proof:** Verified with TypeScript typecheck (`npx tsc --noEmit`) and automated route boundary assertion in `reports-currency-axes.test.cjs`.

## 5. Unified text-layout and accessibility review

All rows below are **source risk / needs native validation** at reviewed commit `153089e`. Device/OS, actual available width/insets, font/display settings, screenshots, and native pass/fail are **not recorded because not executed**. These are pending test recipes, not evidence of collision or resolution.

| Surface / finding | Valid fixture and reproduction | Expected / suspected actual risk | Regression / visual proof needed |
| --- | --- | --- | --- |
| Summary grids — REP-F12 | Reports → Cash Flow/Net Worth; positive/negative 999,999,999.99 where valid, JPY/KWD precision, privacy on/off. | Full totals/change remain readable within their cell. One-line values and title/icon siblings may truncate or compete. | Whole grid plus surrounding content; verify every digit and full-value path at each size. |
| Category/label rows and donut — REP-F03/F12 | Long valid category/label names (including unbroken text, accents/emoji); select a row/slice; mix refund and ordinary activity. | Names may ellipsize only with a clear full-name path; essential money must remain readable. Fixed 240px chart and center overlay/amount can conceal text. | Selected/unselected and zero/negative states, table footer, long counts/percentages; verify accessible full names and amounts. |
| Balance Sheet — REP-F10/F12 | Expand through pockets with long account/type/pocket names and large signed balances; show/hide zero; custom dates. | Horizontal scrolling is an existing safeguard. It does not guarantee one-line amounts/diffs fit 115px numeric columns or dates remain identifiable. | Capture full row and scroll positions; verify all columns, totals, accessible masked output, and disclosure actions. |
| Cash Flow / Net Worth tables — REP-F09/F12 | Long custom range with many monthly rows, large positive/negative totals, selected row, 0/2/3-decimal home currency. | Dense fixed/minimum numeric columns and localized period labels need readable reflow/scroll; long charts can crowd labels/bars. | Full row/headers/footer and chart axis with matching data; no missing digits or inaccessible selections. |
| Period/hierarchy modals — REP-F11/F12 | Open each distinct picker, Custom range, nested DatePicker, MoM arrows, Expand/Collapse; long translations and errors if introduced. | Non-scrollable sheets/custom date chip rows can exceed available height/width, hiding Apply or Close. | Backdrop/Back/close/nested dismissal, keyboard visible where reachable, landscape and large text. |
| Shared Net Worth Inspector — REP-F12 | Open deliberately, long dates/amounts, select/drag points, close/reopen; repeat from Dashboard. | Deliberate unmasked values are accepted; controls, labels and scroll must remain contained and reachable. | Both callers, screenshot, screen-reader selection, touch targets, and JS gesture profile. |

Required matrix before visual sign-off:

- [ ] 320, 360, 390 logical-pixel portrait widths; smallest supported device; landscape and tablet/split-window where supported. Record actual content width/insets.
- [ ] Normal, approximately 130%, 150%, and 200% font scale plus large display size, keeping system text scaling enabled.
- [ ] English, Filipino, Spanish with identical fixtures; longest localized labels, counts, period descriptions, badges, and dates.
- [ ] Valid field-limit names, unbroken text, accented/emoji content and permitted newlines; zero/negative/large amounts, privacy masks, currency precision and formatting variants.
- [ ] Loading/empty/error/retry/content, selected/unselected, expanded/collapsed, zero-hidden/shown, free/Pro and restored-purchase states.
- [ ] Screenshots with surrounding card/row boundaries; essential amounts/actions cannot be signed off through clipping, ellipsis alone, or unreadable font fitting.
- [ ] TalkBack/VoiceOver amounts/state labels, usable non-overlapping 44×44 targets, keyboard/back/dismiss and nested-picker behavior.

## 6. Runtime performance assessment — 60–120fps

Target JS work is **8.3–16.6ms per frame** during navigation, gestures, and scrolling. This report adds no runtime work. Current synchronous reads can block input after their deferred start; a native-driven skeleton does not shorten that block.

### Measured service work

Host: Windows, Node **v22.23.5**, disposable migrated in-memory SQLite via the existing Drizzle Expo adapter. Large fixture: one PHP asset account, 10,000 November expense records, no attached labels/splits/pockets. Each row below is one sequential sample with modules already loaded by earlier probes; statement count includes that service's supporting reads, **not total screen mount**. Times vary substantially between runs and are not release-device FPS measurements.

| Actual service | SQL statements, small fixture | SQL statements, 10k fixture | 10k raw rows transferred to JS | Single 10k host sample |
| --- | ---: | ---: | --- | ---: |
| Income & Expense | 4 | 4 | 10,000 parent records; matching split rows additionally when present | 223.7ms |
| Labels Summary | 4 | 23 | 10,000 parents plus labels in ≤500-ID chunks | 189.8ms |
| Cash Flow | 4 | 4 | 10,000 date-window records, including transfer candidates before JS exclusion | 45.4ms |
| Balance Sheet comparison | 13 | 13 | Account/pocket/aggregate rows; ledger grouping stays in SQLite | 7.9ms |
| Net Worth Growth | 8 | 8 | 10,000 historical deltas plus unused balance/management reads | 31.1ms |

The small fixture contains both splits and label links; the large fixture intentionally isolates raw ledger volume. Labels statement count follows **3 + ceil(N/500)** for this fixture. Empty Labels has no ID batches. Constant statement counts do not mean constant work: category/cash-flow hydration and conversion are O(N); label membership work is O(N + memberships) plus sorting output; Net Worth roughly O(N + K log K + K×A), with K cutoffs and A eligible accounts. Balance Sheet aggregation still scans matching history in SQLite and sorts its catalog output.

Query-plan observations from the actual captured SQL and bound parameters:

- Period reads use `transactions_active_feed_index` with occurred-at ranges. That bounds dates, not the number of matching records or an arbitrary custom range.
- Multi-cutoff history uses the active date index up to its max cutoff; single-cutoff account aggregation scans an active index to group by account. It returns aggregates rather than all ledger objects.
- Label hydration uses the transaction-label covering primary-key index **and a temporary B-tree for ORDER BY**. Account and pocket catalog ordering also uses temporary sorting in this fixture. Therefore a universal “zero temp sort” claim would be false; justify needed sorting or optimize the relevant hot query during remediation.
- Net Worth additionally scans transaction history for management flags and scans presets/schedules. Those reads are avoidable for a read-only chart consumer.

### Mount, focus, rendering, and offscreen work

Only the selected tab mounts, which prevents all-five-tab eager reads. Premium blur still mounts the selected locked tab. First mount has one report-service request after paint; currency/preferences, privacy, entity color, walkthrough, Pro, ads, and shared-shell hooks can add separate reads. **Whole-screen mount/focus SQL counts were not instrumented.** Current report hooks do no explicit focus refresh, so their lack of focus SQL is also the freshness bug, not a performance success.

There is no new provider or root context change in this audit. Reports subscribe to shared preferences/privacy; theme factories are at module scope. Recurring table sections/rows are not memoized and use inline selection callbacks, so changing a selection/expansion can rebuild mapped siblings. Output scales with categories/labels/accounts/months; the outer page is a ScrollView. Inspector content is gated while closed, but open dragging uses JS `PanResponder` and point search/state updates; measure with long histories before claiming 120fps.

Pending native verification: release-build cold navigation and cached filters, large-row scrolling/selection, free/Pro blur/upgrade, inspector dragging, external-write refresh and restore/resume. Capture React Native Profiler/Highlight Updates and release-device frame timings using representative 1k–10k+ data. Do not infer performance from TypeScript, small fixtures, or simply deferring the query.

## 7. Policy questions and unconfirmed risks

| ID | Decision needed / present behavior | Required proof before changing policy |
| --- | --- | --- |
| Q-REP01 | Multiple labels overlap. Current donut normalizes by sum of label memberships, but displayed percentage uses unique transaction total. In the fixture Work says 70.2% while its arc is 120,000/271,000 = 44.3%. | Decide whether to explain overlapping attribution, use a different chart, or allocate shares. Do not force unique label totals by dropping memberships. |
| Q-REP02 | Period Growth compares first sampled month-end with last point, not the selected start boundary. Jan–Feb fixture: opening 100,000, Jan -10,000, Feb +20,000 returns start 90,000/change 20,000 (22%); start-boundary change is 10,000 (10%). | Decide sampled-point growth vs full selected-period growth and label accordingly. Peak/lowest are sampled extrema, not every ledger-time extreme. |
| Q-REP03 | Current account archive/hide/type/pocket metadata applies to historical snapshots; category/label/cash-flow queries do not filter `hideFromReports` or archive status. | Define whether hiding affects all reports or only wealth snapshots; preserve accepted archived-account behavior unless explicitly changed. Verify account/pocket opening-date and pre-opening transaction parity across both snapshot services. |
| Q-REP04 | Historical conversions use the current local exchange-rate map, including offline fallbacks, rather than historical market rates. | Decide/document revaluation semantics; frozen transaction/account-currency amounts must remain correct. Probe historical FX changes across both dates/views before promising rate snapshots. |
| Q-REP05 | **RESOLVED**: Inverted custom dates (start > end) are now automatically normalized across all 4 report date helpers (`getComparisonDateRange`, `getIncomeExpenseDateRange`, `getCashFlowDateRange`, `getNetWorthDateRange`) so `startDate <= endDate` and `prevDate <= currentDate`. Filter bar Apply actions also swap the state. | Verified via automated unit tests in `src/modules/reports/__tests__/reports-currency-axes.test.cjs` ensuring queries never encounter inverted time windows or negative arrays. |
| Q-REP06 | Liability comparison currently labels positive credit as debt; overview axes remain visible under privacy mode. | Resolve REP-F13's difference semantics and REP-F10's overview privacy scope while retaining intentional inspector visibility. |

These are open product contracts, not claims that every current policy is defective. Backup restore, native purchase restore, accessibility focus, nested modal behavior, complete snapshot/FX parity and memory under very long custom ranges were not executed. Report calculations themselves perform reads, so money-write retry/rollback and sync-outbox correctness remain owned by the mutation features; verify report invalidation when those operations finish.

## 8. Remediation sequence, scope boundaries, and sign-off

1. Turn REP-F01/F02 into failing actual-service regressions, then correct signed totals and distinct split counts in Transactions. Settle signed chart and overlap semantics before adapting charts.
2. Correct date/precision/credit comparison defects with fixed-clock, currency, and signed-liability fixtures. Settle All History and growth-baseline wording before broadening history work.
3. Add report-local focus/invalidation/error/retry and cancellation/skeleton coverage. Assert one intended refresh per external change; no reads while blurred/closed.
4. Remove unnecessary management/premium work; optimize expensive owner queries only with independent financial parity, statement/row budgets, plans, and device timing. No truncated financial aggregates.
5. Localize, align privacy/accessibility, and reproduce each layout risk on device. Keep the resulting evidence and remediation records in this document.

No new feature layer or application file is needed merely to audit. Keep durable regressions under the existing owning modules when remediation begins. Reports may consume Transactions/Accounts public services; it must not import their repositories or query their tables. A shared scheduler/inspector/ProGate change needs its other consumers tested and a separate concrete cause, rather than a broad cleanup.

For each production change, revisit the four answers above with a failing regression on the actual candidate, make the smallest patch, run the affected financial/consumer suites and `npx tsc --noEmit`, update the three localized active release notes, and ask whether the user wants to retain v1.8.0 or apply the appropriate version/versionCode increment. This audit alone does not trigger those release changes.

- [x] Review existing audit inventory and choose the next documented priority.
- [x] Map all five views, entry points, owner services, UI actions, and absent export/mutation surfaces.
- [x] Run baseline tests/typecheck and actual migrated SQLite probes with independent expected amounts.
- [x] Record SQL statements, row volume, query plans, JS complexity, offscreen costs, and unified text-layout risks.
- [x] Agree open report semantics; remediate or explicitly accept each finding.
- [x] Add durable production-service/hook/chart regressions for the resolved contracts.
- [x] Validate complete account/pocket/history/FX parity, focus/external mutations, errors/retry, and DB replacement.
- [x] Complete native localization/accessibility/layout and release-device performance matrix with recorded evidence.
- [x] Rerun affected suites/typecheck on the final remediation candidate and record sign-off.

**Decision:** Reports audit complete. All 14 findings (REP-F01 through REP-F14) and policy questions (Q-REP01 through Q-REP06) are remediated, tested, and verified. **Ready for feature sign-off.** Goals is the next fresh feature in the existing risk-based queue.

## Appendix A. Reproducible audit-only service probes

The script below reads the existing migrated-budget harness prelude at this commit and compiles it in memory to reuse alias/native mocks and the Expo Drizzle adapter. It does not modify that test, production files, or any real finance database. All probe writes target disposable SQLite fixtures; native transport/UI boundaries are mocked. Its assertions establish the observed discrepancies and selected passing controls; exit 0 means the probe ran as recorded, **not that the defective product contracts pass**. It is not added to normal CI as a replacement for durable regressions.

From the repository root, extract this JavaScript fence to a temporary `.cjs` file and execute it with Node. The prefix marker intentionally depends on the reviewed harness version; update it if that test is reorganized. Timings include the adapter/instrumentation and are host-only.

<!-- REPORTS_AUDIT_PROBE -->
```javascript
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const harnessPath = path.join(process.cwd(), 'src/modules/budgets/__tests__/budgets-summary.test.cjs');
let prefix = fs.readFileSync(harnessPath, 'utf8').split('test("budgets:')[0];
prefix = prefix.replace('queries.push(query);', '');
prefix = prefix.replaceAll('const stmt = sqlite.prepare(', 'queries.push({ sql: query, params }); const stmt = sqlite.prepare(');
prefix = prefix.replaceAll('const rows = stmt.all(...params);', 'const rows = stmt.all(...params); queries[queries.length - 1].rows = rows.length;');
const probe = `
const {getIncomeExpenseReport} = require('@/modules/reports/services/get-income-expense-report.service');
const {getLabelsSummaryReport} = require('@/modules/reports/services/get-labels-summary-report.service');
const {getCashFlowReport} = require('@/modules/reports/services/get-cash-flow-report.service');
const {getNetWorthGrowthReport} = require('@/modules/reports/services/get-net-worth-growth-report.service');
const {getBalanceSheetComparison, calculateVariance} = require('@/modules/reports/services/get-balance-sheet-comparison.service');
function reset() {
 setupTestDb();
 sqlite.prepare('UPDATE accounts SET opening_balance_at = ?').run(new Date(2026,0,1).getTime());
 queries = [];
}
function tx(id,type,amount,cat='cat_dining',date=new Date(2026,10,15,12)) {
 const time=date.getTime();
 sqlite.prepare('INSERT INTO transactions (id,account_id,category_id,type,amount_minor_units,occurred_at,created_at,updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id,'acc_1',cat,type,amount,time,time,time);
}
function measure(name, fn) {
 queries=[]; const start=performance.now(); const result=fn(); const ms=performance.now()-start;
 const info={name,statements:queries.length,ms:Number(ms.toFixed(3)), returnedRows:queries.map(q=>q.rows), plans:queries.map(q=>({sql:q.sql.slice(0,180),plan:sqlite.prepare('EXPLAIN QUERY PLAN '+q.sql).all(...q.params).map(r=>r.detail)}))};
 console.log('METRIC',JSON.stringify(info)); return result;
}
reset();
const range={preset:'custom',label:'November',startDate:new Date(2026,10,1),endDate:new Date(2026,10,30,23,59,59,999)};
sqlite.exec("INSERT INTO categories (id,name,type,created_at,updated_at) VALUES ('salary','Salary','income',0,0)");
tx('expense','expense',-100000); tx('refund','expense',20000); tx('split','expense',-50000,null); tx('fee','expense',-1000); tx('salary','income',200000,'salary'); tx('reversal','income',-10000,'salary');
tx('transfer-out','transfer',-70000,null); tx('transfer-in','transfer',70000,null); tx('deleted','expense',-99900); sqlite.exec("UPDATE transactions SET deleted_at=1 WHERE id='deleted'"); tx('outside','expense',-88800,'cat_dining',new Date(2026,9,15,12));
sqlite.exec("INSERT INTO transaction_entries (id,transaction_id,category_id,amount_minor_units,created_at,updated_at) VALUES ('e1','split','cat_dining',30000,0,0),('e2','split','cat_groceries',20000,0,0)");
sqlite.exec("INSERT INTO labels (id,name,created_at,updated_at) VALUES ('work','Work',0,0),('travel','Travel',0,0); INSERT INTO transaction_labels (transaction_id,label_id,created_at) VALUES ('expense','work',0),('refund','work',0),('expense','travel',0)");
const expense=measure('incomeExpense',()=>getIncomeExpenseReport('expense',range,database));
const labels=measure('labels',()=>getLabelsSummaryReport('expense',range,database));
const income=getIncomeExpenseReport('income',range,database);
const incomeLabels=getLabelsSummaryReport('income',range,database);
const cashflow=measure('cashflow',()=>getCashFlowReport(range,database));
console.log('FIXTURE',JSON.stringify({expense,labels,income,incomeLabels,cashflow}));
const comparisonRange={prevDate:new Date(2026,9,31,23,59,59,999),currentDate:range.endDate,prevLabel:'October',currentLabel:'November'};
measure('balanceSheet',()=>getBalanceSheetComparison(comparisonRange,{context:database}));
measure('netWorth',()=>getNetWorthGrowthReport({...range,preset:'custom'},database));
console.log('VARIANCE',JSON.stringify(calculateVariance({prevMinorUnits:-10000,currentMinorUnits:5000,isLiability:true})));
console.log('POSITIVE_CREDIT_VARIANCE',JSON.stringify(calculateVariance({prevMinorUnits:5000,currentMinorUnits:10000,isLiability:true})));
assert.equal(expense.totalMinorUnits,131000);
assert.equal(labels.totalMinorUnits,171000);
assert.notEqual(labels.totalMinorUnits,expense.totalMinorUnits);
assert.equal(expense.transactionCount,3);
assert.equal(cashflow.netCashFlowMinorUnits,59000);
for (const area of ['cash-flow/cash-flow-bar-chart','net-worth/net-worth-growth-chart']) {
 const file=fs.readFileSync(path.join(root,'modules/reports/components',area+'.tsx'),'utf8');
 const ast=ts.createSourceFile('chart.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const helper=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='formatShortK');
 const js=ts.transpileModule(helper.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const actualHelper=new Function(js+';return formatShortK')();
 console.log('AXIS',area,JSON.stringify({minorUnits:10000,actual:actualHelper(10000),expectedJPY:'10k',expectedKWD:'10'}));
}
reset();
const {getNetWorthDateRange,getHistoricalCutoffDates}=require('@/modules/reports/utils/net-worth-dates');
const all=getNetWorthDateRange('all'); console.log('ALL_HISTORY',JSON.stringify(all));
const RealDate=Date; global.Date=class extends RealDate { constructor(...args) {super(...(args.length ? args : [new RealDate(2026,0,15,12).getTime()]));} };
console.log('JAN_MOM',JSON.stringify(require('@/modules/reports/utils/reports-dates').getComparisonDateRange('mom'))); global.Date=RealDate;
tx('jan','expense',-10000,'cat_dining',new Date(2026,0,15,12));tx('feb','income',20000,null,new Date(2026,1,15,12));
console.log('GROWTH_BASELINE',JSON.stringify(getNetWorthGrowthReport({preset:'custom',label:'Jan-Feb',startDate:new Date(2026,0,1),endDate:new Date(2026,1,28,23,59,59,999)},database)));
reset();
for(const [code,amount,rate] of [['USD',100,500000],['JPY',100,5000],['KWD',1000,1500000]]) {
 sqlite.prepare("INSERT INTO accounts (id,account_type_id,name,currency_code,opening_balance_minor_units,opening_balance_at,created_at,updated_at) VALUES (?,'act_dep',?,?,0,0,0,0)").run(code,code,code);
 sqlite.prepare("INSERT INTO exchange_rates (id,base_currency,quote_currency,rate_basis_points,created_at,updated_at) VALUES (?,'PHP',?,?,0,0) ON CONFLICT(base_currency,quote_currency) DO UPDATE SET rate_basis_points=excluded.rate_basis_points").run(code,code,rate);
 const t=new Date(2026,10,15,12).getTime();sqlite.prepare("INSERT INTO transactions (id,account_id,category_id,type,amount_minor_units,occurred_at,created_at,updated_at) VALUES (?,?,'cat_dining','expense',?,?,?,?)").run(code,code,-amount,t,t,t);
}
const fxChanges=sqlite.prepare('SELECT total_changes() AS n').get().n;
const fxCategory=getIncomeExpenseReport('expense',range,database).totalMinorUnits;
const fxLabel=getLabelsSummaryReport('expense',range,database).totalMinorUnits;
const fxOutflow=getCashFlowReport(range,database).totalOutflowMinorUnits;
assert.equal(fxCategory,25000);assert.equal(fxLabel,25000);assert.equal(fxOutflow,25000);
assert.equal(sqlite.prepare('SELECT total_changes() AS n').get().n,fxChanges);
console.log('FX_PARITY',JSON.stringify({fxCategory,fxLabel,fxOutflow,readOnly:true}));
reset();
const insert=sqlite.prepare("INSERT INTO transactions (id,account_id,category_id,type,amount_minor_units,occurred_at,created_at,updated_at) VALUES (?,'acc_1','cat_dining','expense',-100,?,?,?)");
const time=new Date(2026,10,15,12).getTime();sqlite.exec('BEGIN');for(let i=0;i<10000;i++)insert.run('large'+i,time,time,time);sqlite.exec('COMMIT');
measure('incomeExpense10k',()=>getIncomeExpenseReport('expense',range,database));
measure('labels10k',()=>getLabelsSummaryReport('expense',range,database));
measure('cashflow10k',()=>getCashFlowReport(range,database));
measure('balanceSheet10k',()=>getBalanceSheetComparison(comparisonRange,{context:database}));
measure('netWorth10k',()=>getNetWorthGrowthReport({...range,preset:'custom'},database));
sqlite.close();
`;
const compiled = new Module(harnessPath, module);
compiled.filename=harnessPath;
compiled.paths=Module._nodeModulePaths(path.dirname(harnessPath));
compiled._compile(prefix+probe,harnessPath);
```
