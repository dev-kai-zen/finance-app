# Credit Cards audit — v1.8.0

**Date:** November 24, 2026 — Asia/Manila

**Reviewed commit:** `be395a3` (clean working tree before this audit).

**Stage:** Initial feature audit complete; targeted service probes executed. Remediation and native sign-off remain pending.

**Result:** **NOT READY FOR FEATURE SIGN-OFF.** The selected 111 existing tests and TypeScript pass, but actual-service probes reproduce incorrect credit-limit warnings, missing installment debt after restore, stranded payment credit, and opening-balance inconsistencies. Source review also identifies refresh, privacy, date-status, localization, and performance gaps.

**Changes made:** This audit document only. No production code, migrations, release notes, application versions, or dependencies changed. Version-bump approval is not needed for this documentation-only audit; apply the repository's release-note and version-decision rules when implementing fixes.

## 1. Workflow and current status

This follows the feature contracts, ownership map, action review, findings, performance assessment, and validation structure of the [Accounts](accounts-audit-v1.8.0.md), [Transactions](transactions-audit-v1.8.0.md), [Dashboard](dashboard-audit-v1.8.0.md), [Categories](categories-audit-v1.8.0.md), [Budgets](budgets-audit-v1.8.0.md), and [Google Drive Backup](google-drive-backup-audit-v1.8.0.md) audits. Their historical sign-off statements do not establish Credit Cards correctness.

| Stage | Status | Deliverable |
| --- | --- | --- |
| 1. Audit Credit Cards | Complete | Inventory, domain contracts, concrete financial examples, prioritized findings, and performance assessment. |
| 2. Validate Credit Cards | Partial | Existing suites and isolated actual-service probes executed; permanent regressions and native checks remain. |
| 3. Review findings and policies | Pending | Confirm statement-history, completed-plan, credit-surplus, and due-summary policies. |
| 4. Remediate findings | Pending | Apply small fixes with the four-question investigation gate and regression coverage. |
| 5. Feature sign-off | Pending | Financial parity, visible refresh, localization/privacy, restore parity, and release-device profiling. |

### Evidence used

| Check | Result in this pass | What it establishes / limits |
| --- | --- | --- |
| Credit Cards and credit-card walkthrough suites | **30 passed**, zero failures/skips; approximately 8.0 seconds | Includes ten actual-service/SQLite billing remediation tests. Some other cases insert schema fixtures or repeat arithmetic instead of executing the service named by the test. |
| Related Accounts, Transactions, Notifications, and user-data registry suites | **81 passed**, zero failures/skips; approximately 11.4 seconds | Related contracts remain green. Notification settings tests do not establish OS delivery or correct rescheduling. |
| `npx tsc --noEmit` | **Passed, exit 0** | Repository-wide compile-time integrity. |
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
| Check limit before save | Expense form synchronously calls `checkCreditLimitExceeded`, then offers Proceed/Cancel if exceeded. | Confirmed billed-edit and prepayment false warnings; CC-F01. No server request is required. |
| Edit purchase | Transaction update obtains edit state; billed installments protect account/amount/date, then applies allowed plan changes and reconciliation. | Authoritative billed-plan guard exists. An edit-state read performs up to 123 SQL statements; CC-F07. Moving a billed one-time purchase's date does not relocate its statement; policy Q-CC01. |
| Pay card / refund | Positive ledger amounts allocate against oldest outstanding statements; unused credit offsets unbilled activity. | Ordinary payment-reduction tests pass. Credit stranded after a charge disappears, and opening corrections interact incorrectly with payment adjustments; CC-F03/04. |
| Delete / restore purchase | Ledger service changes deletion state and reconciles in the same transaction. | One-time charge restore has existing coverage. Installment restore undercounts total debt; CC-F02. |
| Change opening balance / card configuration | Accounts saves native-currency details and invokes billing reconciliation for card-related edits. | Positive opening credit is lost in monitoring; CC-F05. Existing statement due dates are retained; policy Q-CC01. |
| Finish an installment schedule | Scheduled installment entries are issued, and monitoring counts `status === "active"`. | Even a fully billed, fully paid plan remains active; CC-F10. |
| Global Quick Entry while screen stays focused | Transaction hook emits `FINANCE_APP_TRANSACTION_MUTATED`; monitoring hook does not subscribe. | Visible card data can remain stale until another focus/currency refresh; CC-F06. |
| Bill reminders and utilization alerts | Notifications obtains the same public monitoring summary and schedules local OS notifications. | Inherits financial inaccuracies; full history is calculated even for targeted utilization checks. Delivery/rescheduling needs dedicated tests. |
| Archive/type change/reset/restore | Monitoring excludes archives; Accounts can remove details on type change while history tables remain; registered tables support reset/sync infrastructure. | Registration/source paths reviewed; complete backup/restore and type-change round trips are pending. |
| Change language / privacy / date | Core labels are English, inspection modal formats raw amounts, UI status derives UTC date while service uses local dates. | CC-F08/09/12. Walkthrough translation tests cover walkthrough keys, not the feature body. |

The [Transactions audit's settled advisory-warning policy](transactions-audit-v1.8.0.md) remains applicable. This audit does not treat the absence of mandatory warning enforcement on transfers or automated imports as a bug.

## 5. Independent reproducible checks

Unless overridden below, use the existing billing fixture: `today = new Date(2026, 10, 21, 12)`, card `card`, PHP limit `5000000`, statement day `10`, due day `25`, zero opening balance, and charges dated November 5 at local noon. `f.reconcile()` invokes `reconcileCreditCardBillingInContext` inside a Drizzle transaction; `f.monitor()` invokes `getCreditCardMonitoring`.

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

These probes characterize the current defects. They are not passing tests of desired behavior and must become permanent regressions before remediation sign-off.

## 6. Prioritized findings

P1 means financial correctness or misleading debt/limit decisions. P2 means material runtime, lifecycle, privacy, localization, or recovery gaps. Every finding is open; recommended fixes have not been implemented.

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| CC-F01 | P1 | Credit-limit preview double-counts billed edits and loses unused credit. | Actual-service probes. |
| CC-F02 | P1 | Restoring an installment purchase does not restore its billed debt. | Actual-service/SQLite probe. |
| CC-F03 | P1 | Removing/reducing paid charges leaves credit trapped in statements. | Actual-service/SQLite deletion probe; reductions share the path. |
| CC-F04 | P1 | Opening reconciliation absorbs payment adjustments and changes debt on repeat. | Actual-service/SQLite two-run probe. |
| CC-F05 | P1 | Positive opening credit is ignored by billing/monitoring. | Actual-service/SQLite probe. |
| CC-F06 | P2 | Focused monitoring does not refresh after external mutations. | Hook/event source trace; lifecycle regression pending. |
| CC-F07 | P2 | All-card synchronous history reads, per-installment probes, and incomplete chunking violate performance requirements. | SQL counts, query plan, scale probes, and source trace. |
| CC-F08 | P2 | Activity inspection reveals historical amounts in privacy mode. | Rendering source trace; native check pending. |
| CC-F09 | P2 | Statement badges use UTC/stale dates and hide overdue partial bills. | Fixed-date/helper probe plus UI source. |
| CC-F10 | P2 | Completed/fully paid schedules remain counted as active installments. | Actual-service/SQLite probe; completion policy requires agreement. |
| CC-F11 | P2 | Accepted installment inputs can generate zero-principal rows and fail with a database error. | Actual-service/SQLite probe. |
| CC-F12 | P2 | Core feature strings are untranslated; activity close omits keyboard dismissal. | Source trace; native/localized checks pending. |

### [CC-F01] Credit-limit preview does not model the replacement expense correctly

**Problem / evidence:** An unchanged PHP 40,000 billed expense projects PHP 80,000. An unused PHP 1,000 prepayment is ignored when checking a PHP 1,500 expense against a PHP 1,000 limit. See Section 5.

**Cause / path:** `TransactionFormModal` calls `checkCreditLimitExceeded` before save. In [get-credit-card-monitoring.service.ts](../../src/modules/credit-cards/services/get-credit-card-monitoring.service.ts), `excludeTransactionId` filters `ledger` at line 139, after `statementSummaries` has already included the billed charge. [check-credit-limit-exceeded.service.ts](../../src/modules/credit-cards/services/check-credit-limit-exceeded.service.ts), lines 81–84, then adds the replacement amount to clamped outstanding. Clamping has discarded any surplus credit. Its optional context is also not forwarded to the monitoring reads.

**Smallest reasonable fix:** Compute the proposed debt from a signed card balance snapshot, removing the old ledger effect and applying the replacement before clamping. Consume the Accounts/Transactions public service boundary; keep statement/activity construction out of the warning path. Preserve `context` throughout and keep the warning advisory. No new generic warning framework is needed.

**Proof required:** Call the actual service for unchanged/increased/decreased billed and unbilled edits, billed installments, moving accounts, unused/partially allocated prepayment, positive opening credit, refunds, native-currency FX posting, and exact-limit equality. Assert every result field and no writes; exercise Cancel/Proceed through the actual form handler. The current four `credit-limit-check.test.cjs` cases do not execute this service.

### [CC-F02] Installment restore leaves deletion reversals in force

**Problem / evidence:** Restoring the PHP 1,200 purchase restores only PHP 800 of debt; its issued PHP 400 remains cancelled.

**Cause / path:** [reconcile-credit-card-billing.service.ts](../../src/modules/credit-cards/services/reconcile-credit-card-billing.service.ts), lines 153–159, reactivates the cancelled plan. Line 220 skips its existing installment entry. Deletion previously added a negative adjustment; restoration only has an `isCharge` correction branch at line 324, while installment entries fall into the payment-allocation branch. No compensating installment restoration is added.

**Smallest reasonable fix:** Restore the net billed installment amounts from their persisted schedules while retaining the original entries and deletion adjustments. Distinguish installments from payments in the existing reconciliation loop. Keep ledger restore and billing corrections in one transaction.

**Proof required:** Delete/restore before the first bill, after one bill, after multiple bills, after payments, and after a cutoff passes in Trash. Assert ledger parity, per-statement issued/remaining amounts, unbilled principal, and no new entries on repeated reconciliation. Inject a correction-write failure and assert full rollback.

### [CC-F03] Credit remains allocated to statements that no longer owe it

**Problem / evidence:** A paid PHP 1,000 charge is removed while a PHP 1,000 unbilled purchase remains. The ledger nets to zero but monitoring reports PHP 1,000 outstanding.

**Cause / path:** The charge-reversal branch reduces its statement total below zero. The positive-transaction loop only releases allocation if the payment itself was reduced, and treats its original `100000` as fully allocated. Monitoring clamps each negative statement total to zero, so that surplus cannot offset another statement or unbilled principal.

**Smallest reasonable fix:** Release excess payment/refund allocations when statement charges shrink, then reapply credit in the existing deterministic oldest-first order. Preserve adjustment history and the signed credit pool; do not patch only the displayed total, which would leave reminder allocations wrong.

**Proof required:** Paid charge deletion, amount reduction, move to another account, refund, restore, and overpayment across multiple statements/unbilled installments. Assert aggregate debt equals ledger debt and allocations never consume more than current charges; verify idempotence, issued-amount parity, and rollback.

### [CC-F04] Opening-balance repair incorrectly includes payment-linked adjustments

**Problem / evidence:** Reducing a PHP 1,000 payment to PHP 500 first produces PHP 500 remaining debt. A second reconciliation erases it without a ledger change.

**Cause / path:** `openingBase` at lines 123–127 of reconciliation sums all `opening_balance` and `adjustment` entries in the opening statement. It includes the `+50000` adjustment linked to the reduced payment. The next run treats that payment correction as an opening-balance change and inserts an unrelated `-50000` adjustment.

**Smallest reasonable fix:** Restrict opening-principal reconciliation to opening entries and opening-owned adjustments, excluding transaction-linked payment/refund corrections. Preserve the existing append-only adjustment pattern.

**Proof required:** Opening debt with payment reduction/increase/delete/restore, refund corrections, actual opening-balance edits, and multiple reconciliation runs. Assert both issued and remaining amounts, ledger equality, and stable entry counts after convergence.

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
| Q-CC08 | Ledger order is timestamp/creation time without a final ID tie-breaker, and the card stores an inspection snapshot in local state. | Add equal-timestamp allocation parity and refresh-while-modal-open tests. Do not assume deterministic allocation or a live updating modal from current unit tests. |

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

The account balance aggregate scans active ledger data across accounts. Per-card monitoring then hydrates `T` transactions, `E` statement entries, `S` statements, and `P` plans. Maps avoid several nested lookups, but item sorting is up to `O(E log E + T log T)` and memory grows with history. Reconciliation additionally does per-installment existence probes and can filter all statements for each positive ledger transaction (`O(credits × S)`). It is not an `O(1)` focus read.

### Measured synchronous duration

Single samples from warm `f.monitor()` using the existing Drizzle/Node SQLite harness, all transactions on one card and already reconciled:

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

No production changes were made during this audit. Before each fix, explicitly answer these four questions again against the then-current code:

1. **What is the actual problem?** Use the finding's concrete fixture or a failing regression; distinguish confirmed defects from Section 7 policy questions.
2. **Why does the current implementation cause it?** Confirm the named function and full caller path, including the transaction boundary and presentation consumer.
3. **What is the smallest reasonable fix?** Use the localized recommendation above. Explain any proposed new file; avoid surrounding refactors, new caches, and duplicate financial formulas.
4. **How will we prove the fix does not break other features?** Specify the actual-service, failure/rollback, query-bound, and UI regression cases applicable to that finding; run `npx tsc --noEmit` and the affected suites.

Suggested order: add the independent financial fixtures; fix CC-F02/03/04/05; correct CC-F01 against the same balance model; then address performance/refresh, lifecycle/input validation, privacy/date/localization, and reminder/restore validation. Keep production diffs surgical and add localized release notes when implementing changes. Ask whether fixes stay in v1.8.0 or receive the appropriate semantic-version bump at that implementation stage.

## 12. Feature sign-off checklist

- [x] Inventory routes, UI actions, service/repository ownership, schema, and alternate consumers.
- [x] Run the existing Credit Cards/walkthrough and selected related suites: 111 passed.
- [x] Run repository TypeScript verification successfully.
- [x] Reproduce financial discrepancies through actual services and real SQLite fixtures.
- [x] Measure representative SQL counts, sorting plan, and desktop scaling; state the device-performance limits.
- [ ] Implement and regression-test CC-F01 through CC-F12; preserve exact monetary and historical parity.
- [ ] Settle the history/completion/credit/due-summary/privacy policies and validate the unconfirmed risks.
- [ ] Verify active-screen refresh, loading/retry behavior, privacy, language changes, and keyboard handling in the native app.
- [ ] Validate notifications, backup restore, reset, archived cards, and account type changes end to end.
- [ ] Profile release devices with large fixtures and establish the 60–120fps target with measured frame data.
- [ ] Synchronize localized release notes and confirm any version/versionCode decision when fixes are implemented.

**Credit Cards remains open for remediation and validation; feature sign-off is not granted by this audit.**
