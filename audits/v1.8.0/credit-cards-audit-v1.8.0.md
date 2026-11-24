# Credit Cards audit — v1.8.0

**Date:** November 24, 2026 — Asia/Manila

**Reviewed commit:** `be395a3` (clean working tree before this audit).

**Stage:** Remediation in progress — CC-F01 through CC-F04 fixed with automated regression coverage. CC-F05 through CC-F12 remain open, and native sign-off remains pending.

**Result:** **NOT READY FOR FEATURE SIGN-OFF.** Incorrect limit warnings, missing installment debt after restore, stranded payment credit, and opening-balance repair are fixed; the combined selected regression run passes 157 tests. CC-F05 through CC-F12 remain pending. Native UI and frame timing remain unverified.

**Changes made:** The initial pass added this audit only. CC-F01 calculates proposed debt from the signed ledger; CC-F02 restores issued installments with compensating adjustments. CC-F03 now releases/reapplies credit against deterministic oldest-first targets, and monitoring counts signed net allocations. CC-F04 restricts opening-principal reconciliation to opening entries and opening-owned adjustments so credit releases cannot rewrite opening principal. Added 44 actual-service/SQLite regressions and two form-handler regressions across these fixes, retaining original records and schedules. No migrations or dependency changes. Release notes skipped as requested; application versions remain unchanged pending a version decision.

## 1. Workflow and current status

This follows the feature contracts, ownership map, action review, findings, performance assessment, and validation structure of the [Accounts](accounts-audit-v1.8.0.md), [Transactions](transactions-audit-v1.8.0.md), [Dashboard](dashboard-audit-v1.8.0.md), [Categories](categories-audit-v1.8.0.md), [Budgets](budgets-audit-v1.8.0.md), and [Google Drive Backup](google-drive-backup-audit-v1.8.0.md) audits. Their historical sign-off statements do not establish Credit Cards correctness.

| Stage | Status | Deliverable |
| --- | --- | --- |
| 1. Audit Credit Cards | Complete | Inventory, domain contracts, concrete financial examples, prioritized findings, and performance assessment. |
| 2. Validate Credit Cards | Partial | CC-F01 through CC-F04 have permanent regressions. Native checks remain. |
| 3. Review findings and policies | Pending | Confirm statement-history, completed-plan, credit-surplus, and due-summary policies. |
| 4. Remediate findings | In progress | CC-F01 through CC-F04 fixed; CC-F05 through CC-F12 remain open. |
| 5. Feature sign-off | Pending | Financial parity, visible refresh, localization/privacy, restore parity, and release-device profiling. |

### Evidence used

| Check | Result in this pass | What it establishes / limits |
| --- | --- | --- |
| Credit Cards and credit-card walkthrough suites | **30 passed**, zero failures/skips; approximately 8.0 seconds | Includes ten actual-service/SQLite billing remediation tests. Some other cases insert schema fixtures or repeat arithmetic instead of executing the service named by the test. |
| Related Accounts, Transactions, Notifications, and user-data registry suites | **81 passed**, zero failures/skips; approximately 11.4 seconds | Related contracts remain green. Notification settings tests do not establish OS delivery or correct rescheduling. |
| `npx tsc --noEmit` | **Passed, exit 0** | Repository-wide compile-time integrity. |
| CC-F01 targeted regression run | **14 passed**, zero failures/skips; approximately 11.3 seconds | Twelve actual-service/SQLite cases plus two extracted actual form-handler cases. Eight service cases failed before the production fix. Native children/persistence callbacks in the form harness are stubbed. |
| CC-F01 combined regression run | **125 passed**, zero failures/skips; approximately 21.7 seconds | Credit Cards, card walkthroughs, Accounts, selected Transactions, notification settings, and user-data registry suites. Includes all 14 new regressions. Native validation remains pending. |
| CC-F02 targeted regression run | **12 passed**, zero failures/skips; approximately 9.1 seconds | Actual delete/restore/reconciliation services and migration-backed SQLite, with fixed clocks. Eleven cases failed before the production fix. Includes preserved history, payments, BNPL, crossed cutoffs, existing broken-state repair, atomic rollback, and 120-statement read bounds. |
| CC-F02 combined regression run | **137 passed**, zero failures/skips; approximately 24.8 seconds | Same combined suites as CC-F01, now including all 12 CC-F02 regressions. Native validation and device frame timing remain pending. |
| CC-F03 regression coverage | **16 passed** in the combined run; all sixteen failed before the production fix | Actual transfer/delete/restore/update/create services and SQLite. Covers released credit, canonical allocation order, refunds, surplus, installments, splits/fees, existing broken states, failure rollback, opening ownership, and 10k-row read bounds. |
| CC-F03 combined regression run | **153 passed**, zero failures/skips; approximately 19.1 seconds; TypeScript also passed | Same combined suites as CC-F02, including all 16 new cases. Earlier CC-F02 payment tests now preserve original records and compare net allocations while allowing release/reapplication history. Native/device checks remain pending. |
| Actual-service financial probes | **Eight financial/validation scenarios reproduced** | Calls production monitoring, limit-check, installment creation, and reconciliation services with migration-backed in-memory SQLite. Fixture edits use explicit SQL; this is not a native interaction test. See Section 5. |
| Calendar/status probe | UTC/local mismatch and overdue-partial precedence reproduced | Executes the actual status helper and the date expression used by the UI with a fixed instant. Native clock rollover remains untested. |
| Query counts and query plan | Cold monitor **30 statements / 3 writes**; warm monitor **8 statements**; 120-month edit-state read **123 statements** | Fixture-specific counts, including transaction control where applicable. Expo bridge/device costs are not measured. |
| Scale probe | Warm monitor: **6.30 ms / 109.29 ms / 516.20 ms** at **1 / 1,000 / 10,000** transactions | Single desktop Node/SQLite samples, not distributions, mobile timings, or measured FPS. |
| Source tracing | Route, screen, cards/modals, hooks, services, repository, schema, transaction/account callers, notification consumers, and table registry | Refresh/privacy/keyboard/localization findings are source-confirmed; no native screenshots or accessibility automation were run. |
| Native app, notifications, backup restore, release-device profiling | **Not run** | No claim of feature sign-off, native layout parity, OS notification delivery, or sustained 60–120fps. |

Commands executed from the repository root:

```powershell
node --test --test-reporter=spec src/modules/credit-cards/__tests__/*.test.cjs src/modules/walkthrough/__tests__/credit-cards-walkthrough.test.cjs
node --test --test-concurrency=2 --test-reporter=spec src/modules/accounts/__tests__/*.test.cjs src/modules/transactions/__tests__/transactions.test.cjs src/modules/transactions/__tests__/transactions-split.test.cjs src/modules/transactions/__tests__/form-integrity.test.cjs src/modules/notifications/__tests__/reminder-settings.test.cjs src/infrastructure/database/__tests__/user-data-tables.test.cjs
npx tsc --noEmit
```

CC-F01 follow-up commands:

```powershell
node --test --test-name-pattern=CC-F01 --test-reporter=spec src/modules/credit-cards/__tests__/billing-remediation.test.cjs src/modules/transactions/__tests__/form-integrity.test.cjs
node --test --test-concurrency=2 --test-reporter=spec src/modules/credit-cards/__tests__/*.test.cjs src/modules/walkthrough/__tests__/credit-cards-walkthrough.test.cjs src/modules/accounts/__tests__/*.test.cjs src/modules/transactions/__tests__/transactions.test.cjs src/modules/transactions/__tests__/transactions-split.test.cjs src/modules/transactions/__tests__/form-integrity.test.cjs src/modules/notifications/__tests__/reminder-settings.test.cjs src/infrastructure/database/__tests__/user-data-tables.test.cjs
npx tsc --noEmit
```

CC-F02 follow-up: reran the combined command above, `npx tsc --noEmit`, and the focused command below:

```powershell
node --test --test-name-pattern=CC-F02 --test-reporter=spec src/modules/credit-cards/__tests__/billing-remediation.test.cjs
```

CC-F03 validation reran the combined command above and `npx tsc --noEmit`. Its 16 cases can also be selected with:

```powershell
node --test --test-name-pattern=CC-F03 --test-reporter=spec src/modules/credit-cards/__tests__/billing-remediation.test.cjs
```

The probes reuse `setupTestDb` and `fixture` from [billing-remediation.test.cjs](../../src/modules/credit-cards/__tests__/billing-remediation.test.cjs), compiling the setup portion with the original filename so relative imports resolve normally, without registering its existing tests. The harness adapts Drizzle's Expo SQLite driver to `node:sqlite`; native modules are mocked. Temporary scripts are in `%TEMP%`:

```text
finance-credit-cards-audit-v1.8.0-probes.cjs
finance-credit-cards-audit-v1.8.0-extra-probes.cjs
finance-credit-cards-audit-v1.8.0-performance-probes.cjs
```

These temporary scripts are local investigation artifacts, not committed regression tests. Section 5 preserves the fixture operations and results so the findings do not depend on retaining those files.

Reviewed the required [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [SDK 57 SQLite documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/). The project declares `expo: ~57.0.25` and `expo-sqlite: ~57.0.3`. Scheduling synchronous database work after paint changes when it executes; it does not move that work off the JavaScript thread.

## 2. What Credit Cards should guarantee

1. The local ledger remains the financial source of truth. For a card without extra interest/fees, outstanding debt must agree with `max(0, -(opening balance + active signed ledger amounts))`, even after edits, deletes, restores, payments, and refunds.
2. Billed debt is unpaid issued-statement debt. Unbilled debt includes purchases and remaining installment principal after applying available credit; splitting one purchase into installments must never duplicate or lose principal.
3. A card payment is a transfer into the card. Its account effects remain atomic, and its allocation must not create or destroy money when a billed charge changes or disappears.
4. Opening debt and positive opening credit must reconcile with the same ledger model. Opening-debt corrections must not absorb payment/refund adjustments.
5. A credit-limit preview evaluates the proposed replacement expense once, in the card's native currency, with the old transaction removed and unused credit preserved. Warnings remain advisory under the settled Transactions policy.
6. Installment schedules preserve the exact principal in integer minor units. Unbilled settings can be changed atomically; billed settings remain protected at save time.
7. Reconciliation is idempotent and atomic with the transaction mutation. Repeating it without a new financial event must not change totals or create more adjustments.
8. Statement cutoffs, due dates, overdue status, and reminders agree on local calendar dates, including short months and date rollover.
9. The active screen refreshes after external entry points mutate a card. Closed modals perform no domain work, and expensive reads paint a shell/skeleton before running.
10. Privacy mode masks historical amounts throughout the inspection flow. English, Filipino, and Spanish cover core UI, errors, accessibility labels, and system-generated activity text.
11. Reads and writes preserve the feature boundaries: Accounts owns account configuration, Transactions owns ledger access, and Credit Cards owns statements, plans, allocation, and monitoring.
12. Local operations do not wait for network synchronization. All-card histories must not be repeatedly hydrated merely to display one card and four preview items.

### Independent money example

Use PHP, a PHP 50,000 limit, statement day 10, due day 25, and local dates. Start with zero opening balance; purchase PHP 1,200 on November 5 using three installments, and purchase PHP 500 on November 15.

| State / operation | Billed | Unbilled | Outstanding | Available limit |
| --- | ---: | ---: | ---: | ---: |
| November 21, first installment issued | 400 | 1,300 | 1,700 | 48,300 |
| Pay PHP 400 | 0 | 1,300 | 1,300 | 48,700 |
| Delete the PHP 500 unbilled purchase | 0 | 800 | 800 | 49,200 |
| Restore that purchase | 0 | 1,300 | 1,300 | 48,700 |
| December 10, next installment and November 15 purchase issued | 900 | 400 | 1,300 | 48,700 |

The December bill includes the next PHP 400 installment and the PHP 500 purchase from November 15. The last PHP 400 installment remains unbilled.

Amounts in services are minor units: PHP 1,200 is `120000`. The ledger balance after the PHP 400 payment is `-130000`; issuing installments changes the billed/unbilled partition, never that debt total.

## 3. Where the behavior lives

| Layer / consumer | Files | Responsibility |
| --- | --- | --- |
| Route and public entry | [credit-cards.tsx](../../src/app/credit-cards.tsx), [index.ts](../../src/modules/credit-cards/index.ts) | Thin route adapter; deferred public exports. |
| Monitoring screen | [credit-card-monitoring-screen.tsx](../../src/modules/credit-cards/screens/credit-card-monitoring-screen.tsx) | Pro gate, aggregate due/overdue summary, account chips, selected card, errors, and walkthrough. |
| Monitoring hook | [use-credit-card-monitoring.ts](../../src/modules/credit-cards/hooks/use-credit-card-monitoring.ts) | Focus refresh and data/loading/error state. |
| Card and inspection modal | [credit-card-monitoring-card.tsx](../../src/modules/credit-cards/components/credit-card-monitoring-card.tsx), [credit-card-activity-modal.tsx](../../src/modules/credit-cards/components/credit-card-activity-modal.tsx) | Metrics, statement selection/history, preview items, activity search and full item list. |
| Limit warning | [check-credit-limit-exceeded.service.ts](../../src/modules/credit-cards/services/check-credit-limit-exceeded.service.ts), [credit-limit-warning-modal.tsx](../../src/modules/credit-cards/components/credit-limit-warning-modal.tsx) | Proposed expense debt and advisory confirmation. |
| Monitoring computation | [get-credit-card-monitoring.service.ts](../../src/modules/credit-cards/services/get-credit-card-monitoring.service.ts), [credit-card-computations.ts](../../src/modules/credit-cards/utils/credit-card-computations.ts) | Statement/ledger/plan combination, native-currency card metrics, home-currency due totals. |
| Reconciliation | [reconcile-credit-card-billing.service.ts](../../src/modules/credit-cards/services/reconcile-credit-card-billing.service.ts) | Opening/cycle issuance, installments, adjustments, credit allocation, daily reconciliation cache, import work generator. |
| Plan operations | [create-installment-plan.service.ts](../../src/modules/credit-cards/services/create-installment-plan.service.ts), [apply-transaction-installment-changes.service.ts](../../src/modules/credit-cards/services/apply-transaction-installment-changes.service.ts), [replace-installment-plan-for-transaction.service.ts](../../src/modules/credit-cards/services/replace-installment-plan-for-transaction.service.ts), [remove-installment-plan-for-transaction.service.ts](../../src/modules/credit-cards/services/remove-installment-plan-for-transaction.service.ts) | Validate and create/change/remove schedules within the caller's database transaction. |
| Plan edit/preview | [get-installment-plan-edit-state.service.ts](../../src/modules/credit-cards/services/get-installment-plan-edit-state.service.ts), [use-installment-plan-edit-state.ts](../../src/modules/credit-cards/hooks/use-installment-plan-edit-state.ts), [preview-installment-plan.service.ts](../../src/modules/credit-cards/services/preview-installment-plan.service.ts) | Billed-plan locks and first-statement/due-date preview. |
| Date/display helpers | [billing-dates.ts](../../src/modules/credit-cards/utils/billing-dates.ts), [build-installment-schedule.ts](../../src/modules/credit-cards/utils/build-installment-schedule.ts), [statement-activity.ts](../../src/modules/credit-cards/utils/statement-activity.ts) | Calendar boundaries, remainder distribution, display ordering and status labels. |
| Persistence | [credit-card-billing.repository.ts](../../src/modules/credit-cards/repositories/credit-card-billing.repository.ts), [credit-card-billing.ts](../../src/infrastructure/database/schema/credit-card-billing.ts) | Statements, entries, plans, installments, constraints, and indexes. |
| Account configuration | [save-account.service.ts](../../src/modules/accounts/services/save-account.service.ts), [get-credit-card-details.service.ts](../../src/modules/accounts/services/get-credit-card-details.service.ts) | Credit limit, billing days, opening balance, account lifecycle and public details access. |
| Ledger mutation integration | [create-transaction.service.ts](../../src/modules/transactions/services/create-transaction.service.ts), [update-transaction.service.ts](../../src/modules/transactions/services/update-transaction.service.ts), [delete-transaction.service.ts](../../src/modules/transactions/services/delete-transaction.service.ts), [restore-transaction.service.ts](../../src/modules/transactions/services/restore-transaction.service.ts) | Apply plan changes and reconcile billing inside the ledger operation. Transfer services reconcile payment legs too. |
| Alternate consumers | [use-accounts.ts](../../src/modules/accounts/hooks/use-accounts.ts), [schedule-bill-reminders.service.ts](../../src/modules/notifications/services/schedule-bill-reminders.service.ts), [check-instant-alerts.service.ts](../../src/modules/notifications/services/check-instant-alerts.service.ts) | Account-card summaries, bill reminders, and utilization alerts consume the public monitoring service. |
| Reset/sync registry | [user-data-tables.ts](../../src/infrastructure/database/user-data-tables.ts) | Includes all five credit-card tables in reset/replacement/watch infrastructure. |

The reviewed cross-module calls use public APIs. Screens/components do not query Drizzle directly; ordinary billing persistence is in the repository. The financial findings do not justify replacing these boundaries.

## 4. Action-by-action audit

| Action | Current execution path / behavior | Assessment |
| --- | --- | --- |
| Open or focus Credit Cards | Hook schedules one animation-frame callback, then synchronously obtains all-card monitoring. | Initial skeleton exists; warm loads do not re-enable it. All-card history work still blocks JS; CC-F07. |
| Open without Pro | Screen starts the monitoring hook and displays the Pro modal on focus. Closing routes back/home. | Navigation gate exists, but expensive data work is already scheduled beneath it. Gate unnecessary loading as part of CC-F07; do not infer unauthorized data access. |
| No cards / add card | Empty-state action navigates to `/accounts`. | Valid destination, but it does not directly open a new Credit Card form; wording is broader than the action. Native onboarding check pending. |
| Switch card | Account chips choose an already-loaded card; keyed card component remounts for the new account. | No new SQL specifically on chip selection; unnecessary all-card detail hydration happened earlier. |
| Inspect statement or unbilled activity | Card transforms/slices full arrays; activity modal searches the in-memory items and renders a `FlatList`. | Closed activity modal is correctly gated; item search executes zero SQL but scans all loaded items. Historical amounts lose privacy masking in the modal; CC-F08. |
| Create expense / installment / BNPL | Transaction service inserts ledger row, creates schedule, then reconciles within the same transaction. | Atomic structure is sound. Term/principal edge fails at a DB constraint; CC-F11. BNPL has existing schedule coverage. |
| Check limit before save | Expense form calls `checkCreditLimitExceeded`, then offers Proceed/Cancel if exceeded. | CC-F01 fixed: signed ledger balance, edit exclusion, preserved credit, three read-only queries. No server request is required. |
| Edit purchase | Transaction update obtains edit state; billed installments protect account/amount/date, then applies allowed plan changes and reconciliation. | Authoritative billed-plan guard exists. An edit-state read performs up to 123 SQL statements; CC-F07. Moving a billed one-time purchase's date does not relocate its statement; policy Q-CC01. |
| Pay card / refund | Positive ledger amounts allocate against oldest outstanding statements; unused credit offsets unbilled activity. | CC-F03 fixed: excess/misplaced allocations release through adjustments and reapply oldest-first. Monitoring uses net allocations; payment-owned corrections no longer alter opening principal. |
| Delete / restore purchase | Ledger service changes deletion state and reconciles in the same transaction. | CC-F02 fixed: issued installment amounts recover through compensating adjustments; original schedules/entries remain intact. Actual-service rollback and repeated-cycle coverage passes. |
| Change opening balance / card configuration | Accounts saves native-currency details and invokes billing reconciliation for card-related edits. | Positive opening credit is lost in monitoring; CC-F05. Existing statement due dates are retained; policy Q-CC01. |
| Finish an installment schedule | Scheduled installment entries are issued, and monitoring counts `status === "active"`. | Even a fully billed, fully paid plan remains active; CC-F10. |
| Global Quick Entry while screen stays focused | Transaction hook emits `FINANCE_APP_TRANSACTION_MUTATED`; monitoring hook does not subscribe. | Visible card data can remain stale until another focus/currency refresh; CC-F06. |
| Bill reminders and utilization alerts | Notifications obtains the same public monitoring summary and schedules local OS notifications. | Inherits financial inaccuracies; full history is calculated even for targeted utilization checks. Delivery/rescheduling needs dedicated tests. |
| Archive/type change/reset/restore | Monitoring excludes archives; Accounts can remove details on type change while history tables remain; registered tables support reset/sync infrastructure. | Registration/source paths reviewed; complete backup/restore and type-change round trips are pending. |
| Change language / privacy / date | Core labels are English, inspection modal formats raw amounts, UI status derives UTC date while service uses local dates. | CC-F08/09/12. Walkthrough translation tests cover walkthrough keys, not the feature body. |

The [Transactions audit's settled advisory-warning policy](transactions-audit-v1.8.0.md) remains applicable. This audit does not treat the absence of mandatory warning enforcement on transfers or automated imports as a bug.

## 5. Independent reproducible checks

Unless overridden below, use the existing billing fixture: `today = new Date(2026, 10, 21, 12)`, card `card`, PHP limit `5000000`, statement day `10`, due day `25`, zero opening balance, and charges dated November 5 at local noon. `f.reconcile()` invokes `reconcileCreditCardBillingInContext` inside a Drizzle transaction; `f.monitor()` invokes `getCreditCardMonitoring`. The Actual result column preserves initial, pre-remediation observations. CC-F01's first two rows, CC-F02's installment restore, CC-F03's released credit, and the opening-payment repeat case covered by the supporting ownership guard now produce the expected results.

| Probe | Fixture operations | Expected result | Actual result |
| --- | --- | --- | --- |
| Billed edit exclusion | Insert `billed = -4000000`; reconcile; call `checkCreditLimitExceeded` with pending `4000000` and `excludeTransactionId: "billed"`. | Unchanged PHP 40,000 debt; no warning against PHP 50,000 limit. | Baseline still `4000000`; projected `8000000`; `exceeds: true`; over by `3000000`. |
| Unused prepayment in limit preview | Set limit `100000`; insert positive transfer `100000`; reconcile; check pending expense `150000`. | Debt `50000`, within limit. | Projected `150000`; false excess `50000`. |
| Installment delete/restore | Insert `purchase = -120000`; create real three-month plan; reconcile; set purchase `deleted_at`; reconcile; clear it; reconcile. | Before and restored: billed `40000`, unbilled `80000`, outstanding `120000`. | Before correct; deleted `0`; restored billed `0`, unbilled `80000`, outstanding **`80000`**. Original installment entry `+40000` remains offset by deletion adjustment `-40000`. |
| Credit release after billed charge deletion | Insert charge `-100000` and payment `+100000`; reconcile. Add purchase `-100000` dated November 15; reconcile. Delete the old billed charge; reconcile. | Remaining purchase is covered by payment; ledger and debt both zero. | Ledger balance **`0`**, billed `0`, unbilled/outstanding **`100000`**. Payment stays allocated to the now-negative old statement. |
| Opening debt / reduced payment / repeat | Set opening balance `-100000`; insert payment `+100000`; reconcile. Reduce payment to `50000`; reconcile twice. | Billed debt remains `50000` after both runs. | First run `50000`; second run **`0`**. Entries: opening `+100000`, payment `-100000`, payment-linked adjustment `+50000`, new opening adjustment **`-50000`**. |
| Positive opening credit | Set opening balance `+100000`; insert purchase `-200000`; reconcile. | Ledger `-100000`; debt `100000`. | Ledger **`-100000`**, billed/outstanding **`200000`**. |
| Fully billed/paid plan | Create `120000` three-month plan and payment `+120000`; reconcile at February 21, 2027. | Outstanding zero; no ongoing installment obligation, subject to explicit completion policy. | Outstanding `0`; stored plan remains `active`; active count **`1`**. Separate no-payment probe also remains active after all installments issue. |
| Principal smaller than term | Insert purchase `-2`; create real three-month plan within a transaction. | Clear business validation or a supported exact schedule. | `CHECK constraint failed: credit_card_installments_amounts_check`; outer transaction rolls back plan creation. |

For the date probe, use `2026-11-23T16:30:00Z`: it is **November 24, 00:30 in Manila**, but `toISOString().slice(0, 10)` is `2026-11-23`. A fully unpaid bill due November 23 is classified `unpaid` by the UI date path while the service's local-date comparison marks it overdue. Separately, `getStatementPaymentStatus({ issuedAmountMinorUnits: 100, remainingAmountMinorUnits: 50, dueOn: "2026-11-01" }, "2026-11-24")` returns `partial`, concealing overdue status when only one badge is displayed.

These original probes characterize the initial defects. CC-F01 through CC-F04 now have permanent regressions. Further validation remains as described under each finding.

## 6. Prioritized findings

P1 means financial correctness or misleading debt/limit decisions. P2 means material runtime, lifecycle, privacy, localization, or recovery gaps. CC-F01 through CC-F04 are fixed with automated coverage; CC-F05 through CC-F12 remain open. Native verification remains pending.

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| CC-F01 | P1 — FIXED | Credit-limit preview double-counts billed edits and loses unused credit. | Fixed; 12 actual-service/SQLite and two form-handler regressions pass. |
| CC-F02 | P1 — FIXED | Restoring an installment purchase does not restore its billed debt. | Fixed; 12 actual-service/SQLite regressions pass, including failure rollback and 120 statements. |
| CC-F03 | P1 — FIXED | Removing/reducing paid charges leaves credit trapped in statements. | Fixed; 16 new cases pass, including net monitoring, ordered reallocation, rollback, and ownership support. |
| CC-F04 | P1 — FIXED | Opening reconciliation absorbs payment adjustments and changes debt on repeat. | Fixed; ownership guard and four dedicated actual-service regressions pass, covering payment delete/restore, refund corrections, account edits, and convergence. |
| CC-F05 | P1 | Positive opening credit is ignored by billing/monitoring. | Actual-service/SQLite probe. |
| CC-F06 | P2 | Focused monitoring does not refresh after external mutations. | Hook/event source trace; lifecycle regression pending. |
| CC-F07 | P2 | All-card synchronous history reads, per-installment probes, and incomplete chunking violate performance requirements. | SQL counts, query plan, scale probes, and source trace. |
| CC-F08 | P2 | Activity inspection reveals historical amounts in privacy mode. | Rendering source trace; native check pending. |
| CC-F09 | P2 | Statement badges use UTC/stale dates and hide overdue partial bills. | Fixed-date/helper probe plus UI source. |
| CC-F10 | P2 | Completed/fully paid schedules remain counted as active installments. | Actual-service/SQLite probe; completion policy requires agreement. |
| CC-F11 | P2 | Accepted installment inputs can generate zero-principal rows and fail with a database error. | Actual-service/SQLite probe. |
| CC-F12 | P2 | Core feature strings are untranslated; activity close omits keyboard dismissal. | Source trace; native/localized checks pending. |

### [CC-F01] Credit-limit preview does not model the replacement expense correctly — FIXED

**Problem / evidence:** An unchanged PHP 40,000 billed expense projects PHP 80,000. An unused PHP 1,000 prepayment is ignored when checking a PHP 1,500 expense against a PHP 1,000 limit. See Section 5.

**Original cause / path:** `TransactionFormModal` calls `checkCreditLimitExceeded` before save. In [get-credit-card-monitoring.service.ts](../../src/modules/credit-cards/services/get-credit-card-monitoring.service.ts), `excludeTransactionId` filters `ledger` at line 139, after `statementSummaries` has already included the billed charge. The original limit service added the replacement amount to clamped outstanding. Clamping discarded surplus credit, and its optional context was not forwarded to monitoring reads.

**Smallest reasonable fix:** Compute the proposed debt from a signed card balance snapshot, removing the old ledger effect and applying the replacement before clamping. Consume the Accounts/Transactions public service boundary; keep statement/activity construction out of the warning path. Preserve `context` throughout and keep the warning advisory. No new generic warning framework is needed.

**Implemented:** [check-credit-limit-exceeded.service.ts](../../src/modules/credit-cards/services/check-credit-limit-exceeded.service.ts) now reuses the existing public `getAccountTransactionDelta(accountId, context, { excludeTransactionId })` service. It adds the opening balance, subtracts the proposed native-currency expense, then clamps the resulting debt to zero. All reads use the supplied context. It does not load statements/plans/activity, reconcile billing, or change persistence. `occurredAt` remains accepted for caller compatibility; the check continues to use the current active ledger rather than a historical cutoff.

```text
baselineBalance = openingBalance + active signed ledger sum excluding the edited transaction
projectedDebt = max(0, proposedExpense - baselineBalance)
exceededBy = max(0, projectedDebt - creditLimit)
```

**Regression evidence:** Twelve cases in [billing-remediation.test.cjs](../../src/modules/credit-cards/__tests__/billing-remediation.test.cjs) execute the actual service, covering billed amount edits, unbilled/account changes, unused/partially allocated payments, paid-purchase edits, opening debt/credit, refunds, deleted rows, billed installment principal, exact-limit/one-unit-over boundaries, PHP/JPY/KWD and FX-posted amounts, missing/non-card/zero-limit guards, context propagation, and 10k-row query bounds. Monetary results are asserted field by field. Eight cases failed before the fix; all twelve now pass. Two cases in [form-integrity.test.cjs](../../src/modules/transactions/__tests__/form-integrity.test.cjs) execute the actual extracted handlers, checking edit-ID/native-amount forwarding and Cancel/no-write/Proceed-once behavior. The older arithmetic-only `credit-limit-check.test.cjs` cases remain supplementary, not evidence for the fix.

**Performance:** Eligible checks execute exactly **three read-only statements**: account, card details, and one SQL sum scoped to that account. The 10,000-row fixture confirms indexed account lookup and no temporary B-tree sort or statement-history hydration. Aggregation is still `O(N)` in matching card rows, but JS receives one scalar instead of full history. There are zero new queries during typing, zero new mount/focus queries, and no context-provider changes. Native frame timing remains unmeasured. Broader monitoring/reconciliation work remains tracked by CC-F07.

#### Manual verification guide — CC-F01

Use isolated test accounts so other transactions do not affect the expected totals. Run the updated app; no database migration/reset is required. These checks concern the credit-limit warning. Separate budget warnings may still appear under their own rules.

1. **Create a billed-purchase fixture.** Add a PHP Credit Card account with a **PHP 50,000 limit**, **zero opening balance**, statement day **10**, and due day **25**. Record one **PHP 40,000 expense dated before the latest statement cutoff** (November 5, 2026 for this audit's November 24 date). Open Credit Cards and confirm the purchase appears on an issued statement. Keep the card free of other purchases/payments.
2. **Check an unchanged edit.** Edit only the expense description and save. Expect **no credit-limit warning**, one existing transaction updated, and debt still **PHP 40,000**. Reopen the same expense rather than adding another transaction.
3. **Check replacement amounts and the boundary.** On that same expense, save **PHP 30,000**, then **PHP 50,000**. Neither should trigger a credit-limit warning. Try **PHP 50,000.01**: expect projected debt **PHP 50,000.01** and excess **PHP 0.01**. Cancel and confirm the saved expense is still PHP 50,000.
4. **Check advisory confirmation.** Change that expense to **PHP 60,000**. Expect projected debt **PHP 60,000**, excess **PHP 10,000**. Cancel first and confirm nothing changes. Retry and Proceed; confirm the existing expense updates once, with no extra transaction added. Return it to PHP 40,000 before checking other cases on this card.
5. **Check unused prepaid credit on a separate card.** Create another PHP card with a **PHP 1,000 limit**, zero opening balance, and no purchases. Transfer **PHP 1,000 from a funded bank account into that card**. Enter a **PHP 1,500 expense**: expect **no credit-limit warning** and a resulting account debt of **PHP 500**.
6. **Check credit on an edited purchase.** On the first card, with only its PHP 40,000 purchase, transfer **PHP 10,000** into the card. Edit the purchase description without changing the amount. Expect no warning and remaining debt **PHP 30,000**.

**Native status:** Guide supplied; these device interactions have not been performed by the agent. The fix is automated-test verified, while full Credit Cards feature sign-off remains pending.

### [CC-F02] Installment restore leaves deletion reversals in force — FIXED

**Problem / evidence:** Restoring the PHP 1,200 purchase restores only PHP 800 of debt; its issued PHP 400 remains cancelled.

**Original cause / path:** [reconcile-credit-card-billing.service.ts](../../src/modules/credit-cards/services/reconcile-credit-card-billing.service.ts), lines 153–159, reactivates the cancelled plan. Line 220 skips its existing installment entry. Deletion previously added a negative adjustment; restoration only had an `isCharge` correction branch at line 324, while installment entries fell into the payment-allocation branch. No compensating installment restoration was added.

**Smallest reasonable fix:** Restore the net billed installment amounts from their persisted schedules while retaining the original entries and deletion adjustments. Distinguish installments from payments in the existing reconciliation loop. Keep ledger restore and billing corrections in one transaction.

**Implemented:** Added one installment-specific branch in the existing reconciliation service. For each active purchase's statement, a single-pass `Map` groups the original issued installment amounts and the net of its linked entries, including prior adjustments. A mismatch appends only the compensating difference, with a reversal reference. Issued amounts come from the immutable billing snapshots; the schedule and original installment entries are retained. The branch never bills the full purchase as one ordinary charge. It runs regardless of whether the plan just reactivated, so an explicit reconciliation also repairs already-active purchases left inconsistent by an earlier restore. The existing restore transaction covers the source record, plan status, new bills, and corrections atomically.

```text
issuedAmount = sum(original installment entries for this purchase and statement)
netAmount = sum(all linked entries for this purchase and statement)
restorationAdjustment = issuedAmount - netAmount
```

The PHP 1,200 / three-month example now retains the original `+40000` installment and `-40000` deletion adjustment, then appends a `+40000` restoration adjustment. Billed debt returns to PHP 400, unbilled principal stays PHP 800, and total debt returns to PHP 1,200. Subsequent reconciliation writes nothing when the amounts agree.

**Regression evidence:** Added 12 cases to [billing-remediation.test.cjs](../../src/modules/credit-cards/__tests__/billing-remediation.test.cjs). Eleven failed before the fix; all twelve pass after it. They execute the actual public delete/restore services and reconciliation against real SQLite, with fixed clocks. Coverage includes before-first-bill restore, one/multiple issued statements, partial/full/excess payment against the first bill, BNPL, a cutoff passing in Trash, three delete/restore cycles, already-restored broken data, and 120 issued statements. Tests compare monitoring debt, available credit, utilization, due amounts/dates, active-plan counts, and statement summaries; preserve schedule/original-entry records; and assert no idle writes. A trigger-induced correction failure verifies rollback of transactions, plans, schedules, statements, and entries, including newly due bills; retry succeeds.

**Performance:** The new grouping is `O(E + S)` for that purchase's loaded entries and statements, and adds no history reads or UI/context subscriptions. Each statement needing correction uses the existing ID-generation `SELECT`, adjustment insert, and any required issued-total update. The 120-statement test confirms restoration's history-read count matches ordinary reconciliation plus the restore service's one source lookup; ID-generation reads are explicitly excluded from that comparison. No new mount/focus queries or indexes were added. Healthy repeated reconciliation performs no writes. Existing full-history reads/per-installment probes remain CC-F07; no claim of measured native 60–120fps is made.

#### Manual verification guide — CC-F02

Use the updated app and a clean test card so unrelated transactions cannot alter these expectations. No migration or database reset is required. Native interactions below remain for manual verification.

1. **Create the fixture.** Add a PHP Credit Card with **PHP 50,000 limit**, **zero opening balance**, statement day **10**, and due day **25**. Record **PHP 1,200 dated November 5, 2026**, with **three monthly installments** and **no deferred billing**. For later testing dates, choose a purchase whose first cutoff has passed and second cutoff has not.
2. **Confirm the baseline.** Open Credit Cards. Expect **billed PHP 400**, **unbilled PHP 800**, **outstanding PHP 1,200**, and **available PHP 48,800**. The first statement must contain one PHP 400 installment.
3. **Delete the purchase.** In Transactions, delete the original PHP 1,200 purchase. Return to Credit Cards. With no other purchases/payments on this card, expect billed/unbilled/outstanding all **PHP 0**. Historical billing entries remain; the deletion is represented by an adjustment.
4. **Restore from Trash.** In Transactions → Trash, restore that purchase. Return to Credit Cards. Expect the original baseline again: **PHP 400 billed + PHP 800 unbilled = PHP 1,200 outstanding**, with **PHP 48,800 available**. The original PHP 400 installment must appear once; history may also show deletion/restoration adjustments.
5. **Check repeatability.** Leave/reopen Credit Cards, then delete/restore the same purchase again. Each restored state must keep those same amounts, one source purchase, and one original installment entry for that statement. No new purchase or duplicate installment should be created.
6. **Check payment preservation.** With the purchase restored, transfer **PHP 200 from a funded bank account into the card**. Expect **PHP 200 billed**, **PHP 800 unbilled**, and **PHP 1,000 outstanding**. Delete/restore the purchase again. Expect those same totals after restoration and the original payment retained once.
7. **Optional multiple-bill check.** On another clean card with the same settings, create the same purchase dated **October 5, 2026** for this audit's November 24 date. Two cutoffs have passed: expect **PHP 800 billed**, **PHP 400 unbilled**, and **PHP 1,200 total** before and after deletion/restoration.

For a purchase restored before this fix, fully restart the updated app and open Credit Cards to run first-use billing reconciliation. The already-active purchase should recover its missing billed amounts without deleting/recreating the purchase or schedule. Automated coverage also verifies this repair through explicit reconciliation.

**Status:** CC-F02 is fixed and automated-test verified. Native UI verification remains pending. CC-F03 below now also fixes credit reallocation, preserving net payment effects while appending correction history.

### [CC-F03] Credit remains allocated to statements that no longer owe it — FIXED

**Problem / evidence:** A paid PHP 1,000 charge is removed while a PHP 1,000 unbilled purchase remains. The ledger nets to zero but monitoring reports PHP 1,000 outstanding.

**Original cause / path:** The charge-reversal branch reduced its statement total below zero. The positive-transaction loop only released allocation if the payment itself was reduced, and treated its original `100000` as fully allocated. Monitoring clamped each negative statement total to zero and counted only negative credit entries, ignoring positive release adjustments. That surplus could not offset another statement or unbilled principal.

**Smallest reasonable fix:** Release excess payment/refund allocations when statement charges shrink, then reapply credit in the existing deterministic oldest-first order. Preserve adjustment history and the signed credit pool; do not patch only the displayed total, which would leave reminder allocations wrong.

**Implemented:** The existing [reconciliation service](../../src/modules/credit-cards/services/reconcile-credit-card-billing.service.ts) separates charge principal from credit-owned entries, groups signed allocations by transaction/statement, and computes oldest-first allocation targets from loaded data. Credit order is occurrence date, creation date, then ID; statement order is statement date, then ID. Only allocations exceeding those targets receive positive compensating adjustments. Freed credit fills unpaid statements using advancing cursors; any remainder stays available for unbilled spending. Original ledger transfers, statement entries, and installment schedules remain intact. Restoring an older charge moves credit back to the older bill rather than incorrectly leaving it overdue while a newer bill stays paid.

The [monitoring service](../../src/modules/credit-cards/services/get-credit-card-monitoring.service.ts) now sums signed entries, including positive releases, before calculating unused credit. Opening reconciliation excludes transaction-owned adjustments, a necessary CC-F04 support guard so released payment credit cannot change opening principal. All corrections remain inside the existing mutation transaction; no new persistence layer or allocation engine was introduced.

```text
netAllocatedCredit = max(0, -sum(all entries linked to the credit transaction))
unusedCredit = max(0, creditTransactionAmount - netAllocatedCredit)
```

**Regression evidence:** All 16 new cases in [billing-remediation.test.cjs](../../src/modules/credit-cards/__tests__/billing-remediation.test.cjs) failed against the pre-fix implementation and pass in the combined 153-test run. They cover the actual two-leg payment transfer, charge reduction/re-increase, account moves, older/newer statement restoration with due/overdue parity, mixed refunds/payments, surplus credit, credit deletion/restoration, unbilled installment principal, split parents and transfer fees, tied credit timestamps, isolated signed-net monitoring, existing stranded-credit repair, repeated no-write convergence, and two trigger-induced rollback points. The two opening-principal cases verify release ownership and payment reduction across repeated reconciliation. A 10k-row case verifies signed-ledger debt parity and no added history reads. CC-F01 and CC-F02 regressions also pass; installment payment tests retain original records and compare net allocation while allowing the new correction history.

**Performance:** Added maps and sorted targets reuse loaded rows. Grouping is linear in entries/allocation pairs; sorting costs `O(C log C + S log S)` for credits/statements. Target and actual allocation passes use advancing cursors rather than filtering all statements for every credit. There are no added history queries, mount/focus queries, React contexts, or UI subscriptions. Required corrections still generate IDs and insert entries; valid repeated reconciliation writes nothing. The 10k-row test confirms the delete path adds only its source lookup to the existing history-read count, explicitly excluding ID-generation reads. Full-ledger hydration and other reconciliation costs remain CC-F07; native 60–120fps is not claimed.

#### Manual verification guide — CC-F03

Run the updated app with clean test accounts. No database migration/reset is required. Use actual transfers from a funded bank account; keep unrelated card activity out of these fixtures.

1. **Create the fixture.** Add a PHP card with **PHP 50,000 limit**, **zero opening balance**, statement day **10**, and due day **25**. Record **PHP 1,000 dated November 5, 2026** and open Credit Cards so it appears on the November 10 bill. Transfer **PHP 1,000 into the card**, dated November 11. Add a second **PHP 1,000 expense dated November 15**. For this audit's November 24 date, expect **PHP 0 billed**, **PHP 1,000 unbilled/outstanding**, and **PHP 49,000 available**.
2. **Delete the paid purchase.** Delete the **November 5 purchase only**. Keep the payment and November 15 expense. Return to Credit Cards. Expect **PHP 0 billed**, **PHP 0 unbilled/outstanding**, and **PHP 50,000 available**. The remaining PHP 1,000 purchase is covered by the existing PHP 1,000 credit. Confirm the bank transfer remains recorded once and its bank deduction is unchanged.
3. **Restore and repeat.** Restore the November 5 purchase from Trash, then reopen Credit Cards. Expect **PHP 1,000 outstanding**, all unbilled, and **PHP 49,000 available** again. Repeat delete/restore and reopen the screen; amounts must stay consistent. Statement history may show allocation adjustments and reapplications; these are corrections, not duplicate ledger transfers.
4. **Check a reduced charge.** With the first purchase restored, edit it from **PHP 1,000 to PHP 400**. Expect **PHP 0 billed**, **PHP 400 unbilled/outstanding**, and **PHP 49,600 available**: PHP 600 of the existing payment now covers the second purchase. Return the first purchase to PHP 1,000; expect the previous PHP 1,000 outstanding again.
5. **Optional two-bill ordering check.** On another clean card, use the same amounts with the first purchase dated **October 5**, its payment **October 11**, and the second purchase **November 5, 2026**. Initially the October bill is paid and November owes PHP 1,000. Delete the October purchase: both bills should owe zero. Restore it: the October bill should be paid again, November should owe PHP 1,000 due November 25, and the card should not incorrectly report the restored October bill as overdue.

For already-stranded credit, fully restart the updated app and open Credit Cards to trigger first-use reconciliation. The existing payment should cover the correct remaining debt without deleting/recreating it. Automated coverage also verifies repair through explicit reconciliation.

**Status:** CC-F03 is fixed and automated-test verified. Native screen and notification delivery checks remain pending. Release notes were explicitly skipped; application versions are unchanged.

### [CC-F04] Opening-balance repair incorrectly includes payment-linked adjustments — FIXED

**Problem / evidence:** Reducing a PHP 1,000 payment to PHP 500 first produces PHP 500 remaining debt. A second reconciliation erases it without a ledger change.

**Original cause / path:** `openingBase` summed all `opening_balance` and `adjustment` entries in the opening statement. It included the `+50000` adjustment linked to the reduced payment. The next run treated that payment correction as an opening-balance change and inserted an unrelated `-50000` adjustment.

**Smallest reasonable fix:** Restrict opening-principal reconciliation to opening entries and opening-owned adjustments, excluding transaction-linked payment/refund corrections. Preserve the existing append-only adjustment pattern.

**Implemented:** [reconcile-credit-card-billing.service.ts](../../src/modules/credit-cards/services/reconcile-credit-card-billing.service.ts) restricts `openingBase` to entries where `entryType === "opening_balance"` or `(entryType === "adjustment" && entry.transactionId === null)`. Transaction-linked credit releases or reallocations (`transactionId !== null`) are excluded from opening principal. Legitimate account-level opening balance edits (e.g., in Account Settings) continue to append adjustments with `transactionId: null` and converge idempotently.

**Regression evidence:** Six total actual-service/SQLite regression tests in [billing-remediation.test.cjs](../../src/modules/credit-cards/__tests__/billing-remediation.test.cjs) cover CC-F04 (two added during CC-F03 support, four dedicated CC-F04 regressions):
1. `CC-F03: payment-owned corrections never rewrite opening principal on subsequent reconciliation`: Opening debt with unbilled charges and payment release.
2. `CC-F03: reduced opening-debt payments stay correct across repeated reconciliation`: Payment reduced from PHP 1,000 to PHP 500 leaves PHP 500 debt across multiple reconciliation passes.
3. `CC-F04: deleting and restoring an opening-debt payment releases credit and restores debt without altering opening principal`: Deleting a full payment restores PHP 1,000 debt; restoring the payment returns debt to PHP 0; both converge with zero writes on subsequent runs.
4. `CC-F04: refund corrections against opening debt maintain ledger parity and stable entry counts`: Partial refund (+PHP 500) and increased refund (+PHP 1,000) preserve ledger parity; five consecutive runs write zero entries.
5. `CC-F04: account opening balance edits update issued amounts and converge without phantom entries`: Account opening balance changes (PHP -1,000 → PHP -400 → PHP -1500 → PHP 0) adjust statement issued amounts and converge write-free.
6. `CC-F04: multiple reconciliation runs across mixed opening-debt payments write zero rows after initial convergence`: Ten consecutive reconciliation passes on an opening statement with mixed adjustments perform zero inserts, updates, or deletes.

**Performance:** The ownership guard is an in-memory filter on the opening statement's loaded entries array ($O(M)$ where $M < 10$). It adds zero SQL statements, zero JS thread delay, and eliminates runaway insertion of phantom `-50000` adjustments on repeat reconciliation passes.

#### Manual verification guide — CC-F04

Use an isolated test account so other transactions do not affect the expected totals. Run the updated app; no database migration or reset is required.

1. **Create an account with opening debt:**
   - In Accounts, add a new Credit Card: Name `Opening Debt Card`, Currency `PHP`, Credit Limit `50,000`, Statement Day `10`, Due Day `25`, Opening Balance `-1,000` (dated 10 days ago).
   - Open Credit Cards monitoring: verify an opening bill is issued for **PHP 1,000** and Billed Debt is **PHP 1,000**.
2. **Pay the opening debt in full:**
   - Record a transfer of **PHP 1,000** from a checking/deposit account into the credit card.
   - Open Credit Cards monitoring: verify Billed Debt is **PHP 0**, Outstanding is **PHP 0**, and the statement is marked Paid.
3. **Reduce the payment amount:**
   - Go to Transactions, find the PHP 1,000 payment, and edit its amount to **PHP 500**.
   - Open Credit Cards monitoring: verify Billed Debt is now **PHP 500**, Outstanding is **PHP 500**, and Available Limit is **PHP 49,500**.
4. **Trigger repeated reconciliation (Verify the fix):**
   - Record a separate cash transaction (e.g. PHP 20 coffee on Checking Account) or navigate away and back to Credit Cards to trigger reconciliation again.
   - Inspect Credit Cards monitoring: verify Billed Debt remains exactly **PHP 500** (does not silently vanish or reset to PHP 0).
5. **Delete and Restore the payment:**
   - Delete the PHP 500 payment: verify Billed Debt returns to **PHP 1,000**.
   - Go to Trash and Restore the payment: verify Billed Debt returns to **PHP 500**.
6. **Edit the card's opening balance:**
   - In Accounts, edit the card and change Opening Balance from `-1,000` to `-400`.
   - Open Credit Cards monitoring: since PHP 500 was paid and the debt was only PHP 400, verify the opening bill is fully covered (PHP 0 billed) and the surplus PHP 100 credit is available for unbilled purchases.

**Status:** CC-F04 is fixed and verified by automated regression tests. Native screen and device verification remain pending. Release notes were explicitly skipped as requested.

### [CC-F05] Positive opening balances do not offset card purchases

**Problem / evidence:** PHP 1,000 opening credit plus PHP 2,000 expense gives a PHP 1,000 ledger debt but PHP 2,000 monitoring debt.

**Cause / path:** Reconciliation sets `openingTarget = max(0, -openingBalanceMinorUnits)`, handling debt only. Monitoring receives no opening balance in its account input and builds its credit pool only from positive ledger transactions. The account editor accepts signed opening amounts, so positive credit is representable through normal configuration.

**Smallest reasonable fix:** Include opening credit in the card's allocatable credit model and reuse it in limit preview. Keep the stored opening balance as the source; do not insert an ordinary ledger transaction that would double-count the account balance.

**Proof required:** Positive/zero/negative opening balances against billed purchases, unbilled purchases, installments, and subsequent payments. Test opening edits, reopening/restoring the database, and zero-/two-/three-decimal currencies. Agree separately whether surplus credit increases the displayed available limit above its configured cap.

### [CC-F06] External writes leave the focused screen stale

**Problem / evidence:** [use-credit-card-monitoring.ts](../../src/modules/credit-cards/hooks/use-credit-card-monitoring.ts) refreshes only on focus and home-currency dependency changes. [use-transactions.ts](../../src/modules/transactions/hooks/use-transactions.ts) emits `FINANCE_APP_TRANSACTION_MUTATED` after mutations, but the credit-card hook has no listener. Global Quick Entry is mounted by the shared experience shell and can save without changing route focus.

**Cause / path:** Correct database writes and reconciliation do not call this mounted hook's `setData`; no subscription bridges them. The hook also has no explicit database-replacement/resume-date refresh path of its own.

**Smallest reasonable fix:** Subscribe while focused to the established mutation signal, coalesce/cancel scheduled refreshes, and handle replacement/date invalidation through existing app mechanisms. Do not add a global all-data context or another mutation event. Avoid refreshing offscreen stack entries.

**Proof required:** Focus the hook, save via Global Quick Entry, assert one refresh and updated amounts. Check burst events, blur/unmount cleanup, home-currency changes, failure/retry, restore/replacement, and resume across a due-date boundary. A native smoke test must confirm the visible card changes without leaving the route.

### [CC-F07] Monitoring and plan inspection perform unbounded synchronous work

**Problem / evidence:** Warm monitoring still takes 109.29 ms at 1,000 rows and 516.20 ms at 10,000 in the desktop harness. Plan edit state for a 120-month schedule issues 123 SQL statements. An installment lookup with 501 plan IDs emits one query with 501 binds.

**Cause / path:** Monitoring hydrates every card's statements, entries, full ledger, and plans before selection, then sorts full activity arrays before the card slices four previews. The hook uses a single `requestAnimationFrame`; subsequent loads keep `loading` false. `getInstallmentPlanEditState` probes each installment individually. Reconciliation drains its generator synchronously, scans all cards even for unrelated cash mutations, and obtains Accounts management flags it does not need. `listInstallmentsForPlans` does not chunk IDs, unlike the already-fixed statement-entry lookup.

**Smallest reasonable fix:** First separate aggregate/limit data from selected-card history reads using focused repository operations and the existing services. Bound previews/history in SQL; page full inspection with a deterministic ID tie-breaker. Batch billed-installment existence/counts, chunk plan IDs at 500, omit management flags, scope reconciliation to affected accounts, and reuse the existing after-paint/cancellation helper with a loading state for each substantial refresh. Add only indexes supported by measured query plans, via descriptively named migrations.

**Proof required:** Real SQLite parity for every monetary field plus statement counts and `EXPLAIN QUERY PLAN`; 501+ plan IDs; tied timestamps; 1k/10k ledger fixtures; 120-month plans; archived/unselected cards; notification consumers; and import/reset/restore paths. Then profile release-device navigation/scroll/input; scheduling alone cannot establish 60–120fps.

### [CC-F08] Activity modal bypasses privacy mode

**Problem / evidence:** Card metrics/previews call `formatPrivacyAmount`. [credit-card-activity-modal.tsx](../../src/modules/credit-cards/components/credit-card-activity-modal.tsx), lines 200, 216, and 283 onward, renders raw formatted issued/remaining/item amounts, with no privacy hook or privacy prop. Opening “View all” reveals previously masked history.

**Cause / path:** The card passes raw financial records into a separate rendering path that does not apply the existing masking utility.

**Smallest reasonable fix:** Apply the same privacy preference and formatting to the modal summary and activity amounts. Retain actual values for calculation/search; keep masking at presentation.

**Proof required:** Render and toggle privacy while billed/unbilled modals are open; assert no historical amount is visible in text or accessibility output, then verify normal display when disabled. Native screenshots remain required. The privacy treatment of the pending-expense warning is a separate product decision, Q-CC05.

### [CC-F09] Due-status badges disagree with local-date monitoring

**Problem / evidence:** At Manila 00:30 on November 24, a November 23 bill remains “unpaid” in the UTC-based badge path although the service counts it overdue. Partially paid overdue bills are classified “partial” before overdue is considered.

**Cause / path:** The monitoring card freezes `new Date().toISOString().slice(0, 10)` in a mount-only `useMemo` at line 89. The activity modal also uses a UTC date inside a memo depending only on `statementSummary`. The service uses `toCalendarDate(today)`. The helper/card/modal each prioritize partial payment over past due.

**Smallest reasonable fix:** Use a shared local-date/status calculation and update its date on the established focus/resume/day-change path. Represent overdue and payment progress together, or give overdue priority in the single badge. Avoid a permanent per-card ticking timer.

**Proof required:** Fixed clocks in Manila and a negative UTC offset, local midnight/resume, due today versus yesterday, partial/unpaid/paid bills, and helper/card/modal parity. Keep “paid” correct at zero remaining balance.

### [CC-F10] Active installment count never completes a schedule

**Problem / evidence:** A fully issued and fully paid three-month plan has zero debt but still shows one active installment plan. Reconciliation only writes `active`/`cancelled`; no reviewed path transitions a finished plan to `completed`.

**Cause / path:** Monitoring counts stored `status === "active"` rows regardless of remaining scheduled principal. The schema supports `completed`, but the lifecycle does not use it.

**Smallest reasonable fix:** Confirm Q-CC03, then either derive ongoing-plan count from remaining schedule work or explicitly maintain completion/reopening status in reconciliation. Keep unpaid final statements visible independently of whether future installments remain.

**Proof required:** Last issuance, final payment, overpayment, payment deletion, purchase delete/restore, BNPL before first bill, and future schedules. Assert status/count changes do not change principal or hide unpaid statements.

### [CC-F11] Tiny installment purchases pass validation and fail at persistence

**Problem / evidence:** A purchase of two minor units over three months creates a zero-principal installment and fails the `credit_card_installments_amounts_check` constraint. Transaction rollback works, but the user receives a persistence error for an accepted form configuration.

**Cause / path:** Create/replace services validate a 2–120 month term without relating it to principal. `buildInstallmentScheduleRows` distributes the remainder correctly but emits all requested rows, including zero values. The schema requires every principal to be positive. Preview uses the base floor and can show zero monthly payment.

**Smallest reasonable fix:** Validate principal versus term in the existing create/replace and form/preview paths, returning a clear localized message. Prefer rejecting unsupported schedules over changing schema constraints. Keep remainder distribution exact; clarify the preview when payments differ by one minor unit.

**Proof required:** Principal below/equal/above term for JPY/PHP/KWD, uneven division, 2/120-month bounds, BNPL, replacement, rollback, and preview/save consistency. Add invalid/non-finite deferred-month inputs at the public service boundary; current normalization silently floors/clamps some values.

### [CC-F12] Core localization and modal-close behavior are incomplete

**Problem / evidence:** The screen, monitoring card, activity modal, limit warning, status helper, and generated billing descriptions contain English literals such as “DUE THIS MONTH,” “Opening Bill,” “Partially paid,” and “Card purchase.” `useLocalization` in the screen serves Pro/walkthrough text, not those core labels. The activity modal's `handleClose` clears search and invokes `onClose` without `Keyboard.dismiss()`.

**Cause / path:** Feature-body strings bypass translation keys; some system labels are persisted as English snapshots. Search owns a keyboard responder but close does not explicitly dismiss it. The activity close target itself is 36px plus 8px hit slop, so its effective target exceeds 44px; do not incorrectly flag its size.

**Smallest reasonable fix:** Add matching English/Filipino/Spanish keys through existing localization conventions; distinguish system-generated text from user descriptions when translating activity. Call `Keyboard.dismiss()` in the close path. No feature-wide component rewrite is needed.

**Proof required:** Switch languages with populated/empty/error/over-limit/billed/unbilled states, verify plural/status/accessibility text and date locale, preserve user-entered descriptions, and close an activity modal on the first tap with search focused. Check Android back and iOS sheet dismissal too.

## 7. Policy questions and unconfirmed risks

| ID | Question / current behavior | Decision or validation needed |
| --- | --- | --- |
| Q-CC01 | Once a one-time charge is billed, changing its transaction date leaves it on its original statement. Changing account billing days does not rewrite existing statement due dates. | Confirm historical-statement preservation versus retroactive rebilling. Do not label immutable issued history a defect without settling this policy. Test both future cycles and existing opening statements. |
| Q-CC02 | “Due this month” includes every unpaid statement with `dueOn <= endOfMonth`, including past months. “Next due” can therefore be the oldest overdue date. | Confirm the intended catch-up total or rename/separate current-month and past-due obligations. This is not double-counting in the ledger; the separate past-due badge is a subset. |
| Q-CC03 | When does an installment plan complete: last issuance or final repayment? | Either choice must stop showing a fully billed/fully paid plan as ongoing. Preserve outstanding statement debt separately. |
| Q-CC04 | Should positive surplus credit increase available credit above the configured limit, and should future-dated transactions count as current debt? | Current available-limit helper caps at the configured limit; ledger hydration includes future-dated active rows. Agree on display/as-of policy and apply it consistently across Accounts, monitoring, warnings, and notifications. |
| Q-CC05 | Does privacy mode mask the pending-expense warning too? | Historical inspection leakage is CC-F08 regardless. Agree whether the form's own proposed amount and the warning's account totals should follow the same mask policy. |
| Q-CC06 | Reminder identifiers use account + due date + lead offset, without statement ID. Opening and regular statements can share a due date. Utilization alert keys are marked delivered before scheduling completes and remain in memory. | Test identifier collision/coalescing, scheduling failure/retry, threshold re-entry, restart, payment rescheduling, Pro gating, and OS permission changes before claiming reminder sign-off. These are source risks; no native delivery defect was reproduced here. |
| Q-CC07 | Reconciliation cache is published inside the caller's transaction before outer commit. | Probe an outer rollback after successful reconciliation and subsequent same-day read. Cache resets on database replacement, which is good; commit/rollback invalidation remains unproven. |
| Q-CC08 | Allocation ordering is now explicit under CC-F03: credit occurrence/creation/ID and statement date/ID. The inspection modal still stores a local snapshot. | Tied-credit ordering has SQLite coverage. Refresh-while-modal-open and native presentation remain unverified; deterministic allocation does not establish a live updating modal. |

## 8. Runtime performance assessment — 60–120fps

### Mount/focus SQL and complexity

Measured after the actual service has loaded in the test process; module-import/startup cost is excluded:

| Path / fixture | SQL statements | Interpretation |
| --- | ---: | --- |
| First monitoring read, one unbilled ledger purchase eligible for issuance | 30, including 3 writes | Read initiates reconciliation: statement insert, entry insert, issued-amount update. No claim that every focus writes. |
| Warm monitoring, one card and one statement | 8 | Accounts with balances: 2; card statements/entries/ledger/plans: 4; currency settings/rates: 2. Hook/provider queries are additional. |
| Explicit already-reconciled, one-card reconciliation | 17 including begin/commit | Write-free in this fixture but still scans/hydrates history and obtains management flags. |
| Warm monitoring, one card with 1,000 or 10,000 transactions | 8 | Constant statement count does **not** mean bounded data or execution cost. |
| Edit-state read, 120-month installment plan | 123 | Plan, entries, installments, plus 120 individual billed-entry probes. Runs synchronously from the edit hook effect and save checks. |
| Installment hydration with 501 plan IDs | 1 with 501 binds | Violates the repository's ≤500-ID rule. The host SQLite accepts it; this is not evidence of a crash at 501 on every device. |

For `C` cards each having 1–500 statement IDs, the observed warm-service shape is approximately **`4 + 4C`** queries without preloaded accounts; an empty statement set skips entry hydration, and extra statement chunks add queries. Preloaded account arrays avoid the first two queries. Cold reconciliation, settings hooks, notification passes, and imports have additional work.

The account balance aggregate scans active ledger data across accounts. Per-card monitoring then hydrates `T` transactions, `E` statement entries, `S` statements, and `P` plans. Maps avoid several nested lookups, but item sorting is up to `O(E log E + T log T)` and memory grows with history. Reconciliation still does per-installment existence probes. CC-F03 replaces the positive-credit allocation loop's repeated statement filtering with sorted targets and advancing cursors; the remaining full-history work is still not an `O(1)` focus read.

### Measured synchronous duration

Initial-audit samples, before CC-F01 through CC-F03 remediation, from warm `f.monitor()` using the existing Drizzle/Node SQLite harness; all transactions on one card and already reconciled:

| Transactions | SQL statements | Elapsed |
| --- | ---: | ---: |
| 1 | 8 | 6.30 ms |
| 1,000 | 8 | 109.29 ms |
| 10,000 | 8 | 516.20 ms |

These synchronous sections exceed the **8.3–16.6 ms** frame budget in the larger fixtures. Desktop timings cannot predict native FPS, but they demonstrate that the current approach does not bound JS work to a frame. Single-rAF deferral and a skeleton do not make the computation interruptible. The import generator yields only help callers that actually schedule its steps; the ordinary reconciliation caller drains it synchronously.

### Query plan and rendering evidence

The actual statement-entry query, filtered by statement ID and ordered by occurrence/creation time, produced:

```text
SEARCH credit_card_statement_entries USING INDEX credit_card_statement_entries_statement_index (statement_id=?)
USE TEMP B-TREE FOR ORDER BY
```

The existing index helps filtering but does not eliminate sorting. An index proposal must be tested against the complete query shape, including multi-statement lookups, before adding a named migration.

The monitoring hook has one focus subscription, not duplicate mount/focus queries. Its cancellation covers the scheduled focus frame. However, retry/manual refresh executes synchronously; warm refresh does not show a skeleton; there is no focused mutation coalescing path. No new root-context cascade was introduced by this audit, and the reviewed monitoring hook does not add a root navigation subscription.

The card and its recurring preview rows are not memoized. The activity `FlatList` uses an inline `renderItem`; search scans the entire hydrated array per keystroke, although it performs **zero SQLite queries**. Statement pills render the complete history in a horizontal scroll view. Style factories are correctly at module scope, and the activity modal correctly returns early while invisible. The limit-warning modal checks `result` only after its lightweight hooks and lacks an outer visibility guard; it currently mounts no expensive domain hooks, so do not misreport this as hidden ledger loading.

Prioritize reducing database/hydration work before adding memoization. Verify context consumers and row updates with React Native DevTools rather than claiming a measured render cascade from source alone.

### Device checks still required

Use release builds with 1k/10k+ fixtures: cold navigation, repeated focus, global-entry save, card switching, statement inspection/search, keyboard close, and notification refresh. Record JS/UI frame timing, worst synchronous section, and row commits with Highlight Updates/Profiler. Check at both 60Hz and 120Hz where hardware permits. No release build or device FPS measurement was performed in this audit.

## 9. Database relationships, offline behavior, and necessary complexity

| Mechanism | Assessment |
| --- | --- |
| Account → details/statements/plans | Account deletion cascades these owned records. Account history protections are enforced by Accounts; deleting a used account is not a Credit Cards workaround. |
| Plan → installments | Cascade deletion supports atomic unbilled plan replacement/removal. Statement entries retain history via nullable installment references. |
| Statement → entries | Cascade deletion removes only its entries. There is no reviewed user-facing statement-deletion action. |
| Transaction → statement entries | Foreign key uses `SET NULL`, preserving statement snapshots on permanent deletion. Financial/UI parity through permanent Trash purge still needs a full workflow test. |
| Integer principal and remainder distribution | Keep. They preserve exact totals; fix invalid zero-valued schedules rather than moving money calculations to floats. |
| Statement snapshots and compensating adjustments | Keep. History matters. Fix adjustment ownership and credit reallocation without rebuilding the ledger or deleting historical statements. |
| Transaction-owned atomic boundaries | Keep. Plan creation and reconciliation participate in the same local transaction as the source operation. Existing failure-injection coverage proves one charge-adjustment rollback path. |
| Public cross-domain services | Keep. Credit Cards consumes Accounts/Transactions capabilities without taking ownership of their tables. Extend those APIs narrowly if bounded balance/activity access is required. |
| Daily reconciliation guard and replacement reset | Useful but insufficient as performance proof. Reads can still trigger first-use writes and full scans; narrow affected-account work and test rollback invalidation. |
| All-card detail payload shared with reminders and account summaries | Simplify only around demonstrated query needs. Lightweight summaries should not require every statement entry and activity item. Do not introduce another global financial cache. |
| User-data registry | All five credit-card tables are registered. Registration is not a substitute for a restored database's field-by-field financial parity test. |

The reviewed write paths are local and do not await a remote API. Quick Sync table-change handling and OS reminder scheduling are separate from the local commit. This audit does not recommend moving normal card actions behind a network request or adding a new synchronization engine.

Cross-module changes, if needed, should be limited to: a context-aware signed balance capability through Accounts/Transactions; affected-account reconciliation arguments at existing mutation callers; the existing transaction event consumer; and Notifications using the corrected lightweight summary. No route expansion, module restructuring, or new generic business-operation framework is justified.

## 10. Stage 2 regression expansion

| Area | Required permanent coverage |
| --- | --- |
| Limit calculation | Actual `checkCreditLimitExceeded`, all return fields, context propagation, billed/unbilled/plan edits, unused credit, zero/exact limits, FX native amounts, and advisory Cancel/Proceed behavior. |
| Principal and credit conservation | Field-by-field monitoring versus independent signed-ledger baseline after payment/refund/edit/delete/move/restore; opening debt and positive opening credit; multiple statements and credits. |
| Adjustment identity | Repeated reconciliation produces identical debt and stable entry counts after convergence; opening-owned adjustments exclude payment-owned corrections. |
| Installment lifecycle | No billed mutation bypass, unbilled replace/remove, BNPL, uneven principal, minimum principal, final issuance/payment, Trash restore after due dates pass, and atomic failure injection. |
| Date boundaries | Cutoff-day inclusion, days 29/30/31, leap February, due day equal to cutoff, December/January rollover, Manila/negative-offset midnight, and overdue partial payment. |
| Query bounds and plans | SQL count budgets at 1/1k/10k rows, 120-month plans, 501+ IDs, empty fast exits, ID tie-breakers, zero unwanted management scans, and measured query-plan sorting/index behavior. |
| Hook lifecycle and presentation | One refresh per coalesced external event, no hidden/offscreen refresh, cancellable after-paint work, skeleton on substantive reload, data/loading committed together, error/retry, and replacement/resume invalidation. |
| UI privacy/localization | Billed/unbilled modal text and accessibility output, language switches, user-description preservation, first-tap keyboard close, selection persistence, and long statement histories. |
| Reminders and alerts | Mocked scheduling API payloads, same-date statement identifiers, payment rescheduling, schedule failure/retry, utilization re-entry, permissions, and native delivery smoke tests. |
| Backup/reset/type lifecycle | Save database, restore/reopen, compare every card/statement/plan field; reset removes dependent rows safely; type-change/archive/restore preserves the agreed history policy. |

Extend the existing billing/service tests where practical. A small hook/render harness is warranted for refresh and privacy because SQL tests cannot establish visible state. Do not create pass-through services or mirror implementation expressions as proof of correctness.

## 11. Mandatory pre-change gate for remediation

The initial audit changed no production code. CC-F01's reproduced warnings, calculation path, existing scalar ledger service, and failing-before/passing-after tests answered the four questions before its production edit. CC-F02 likewise reproduced the missing installment correction, added a grouped correction branch, and verified parity/rollback/read bounds. CC-F03 reproduced trapped credit, identified both the allocation and signed-net monitoring paths, added ordered correction/reapplication with an opening-ownership guard, and verified all sixteen failing-before cases. Before each subsequent fix, explicitly answer the four questions again against the then-current code:

1. **What is the actual problem?** Use the finding's concrete fixture or a failing regression; distinguish confirmed defects from Section 7 policy questions.
2. **Why does the current implementation cause it?** Confirm the named function and full caller path, including the transaction boundary and presentation consumer.
3. **What is the smallest reasonable fix?** Use the localized recommendation above. Explain any proposed new file; avoid surrounding refactors, new caches, and duplicate financial formulas.
4. **How will we prove the fix does not break other features?** Specify the actual-service, failure/rollback, query-bound, and UI regression cases applicable to that finding; run `npx tsc --noEmit` and the affected suites.

CC-F01 through CC-F04 are fixed with permanent automated regression coverage. Next, address CC-F05 (positive opening balances); then address performance/refresh, lifecycle/input validation, privacy/date/localization, and reminder/restore validation. Keep production diffs surgical. Release notes were explicitly skipped for the requested fixes; versions remain unchanged pending the repository-required version decision.

## 12. Feature sign-off checklist

- [x] Inventory routes, UI actions, service/repository ownership, schema, and alternate consumers.
- [x] Run the existing Credit Cards/walkthrough and selected related suites: 111 passed.
- [x] Fix CC-F01 with 14 new regressions; combined selected run: 125 passed.
- [x] Fix CC-F02 with 12 new actual-service regressions; combined selected run: 137 passed.
- [x] Fix CC-F03 with 16 new regressions, including required opening-ownership support; combined selected run: 153 passed.
- [x] Fix CC-F04 with 4 new dedicated regressions (6 total covering opening balance lifecycle); combined selected run: 157 passed.
- [x] Run repository TypeScript verification successfully.
- [x] Reproduce financial discrepancies through actual services and real SQLite fixtures.
- [x] Measure representative SQL counts, sorting plan, and desktop scaling; state the device-performance limits.
- [ ] Implement and regression-test CC-F05 through CC-F12; preserve exact monetary and historical parity.
- [ ] Settle the history/completion/credit/due-summary/privacy policies and validate the unconfirmed risks.
- [ ] Verify active-screen refresh, loading/retry behavior, privacy, language changes, and keyboard handling in the native app.
- [ ] Validate notifications, backup restore, reset, archived cards, and account type changes end to end.
- [ ] Profile release devices with large fixtures and establish the 60–120fps target with measured frame data.
- [ ] Synchronize localized release notes and confirm any version/versionCode decision when fixes are implemented.

**Credit Cards remains open for remediation and validation; feature sign-off is not granted by this audit.**
