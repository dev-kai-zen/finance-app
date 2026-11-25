# Scheduled Transactions audit — v1.8.0

**Date:** November 25, 2026 — Asia/Manila

**Reviewed commit:** `9ef9301`

**Stage:** 1 — Audit complete. Validation, policy agreement, and remediation have not started.

**Result:** **NOT READY FOR FEATURE SIGN-OFF.** The recurrence calculator, weekend rules, and schedule-table constraints have passing tests. Saving an existing schedule still rebuilds the next date from the original start, one subscription payment cannot be linked to more than one due occurrence, and a failed subscription-history update is ignored after the ledger row is written. Catch-up copies the whole database, and the screen does not mask amounts or localize its core labels.

**Changes made:** This pass added this audit only. No production code, migrations, release notes, or version changes.

## 1. Workflow and current status

This follows the inventory, ownership, action review, findings, performance, and validation structure of the [Transactions](transactions-audit-v1.8.0.md), [Accounts](accounts-audit-v1.8.0.md), [Dashboard](dashboard-audit-v1.8.0.md), [Categories](categories-audit-v1.8.0.md), [Budgets](budgets-audit-v1.8.0.md), [Credit Cards](credit-cards-audit-v1.8.0.md), and [Google Drive Backup](google-drive-backup-audit-v1.8.0.md) audits. Their sign-off statements do not establish Scheduled Transactions correctness. The earlier [screen-by-screen review](../../V1_8_0_v4_SCREEN_BY_SCREEN_FLOW_AUDIT.md) named this screen as item 4 and reproduced the notes-only rewind as S02.

| Stage | Status | Deliverable |
| --- | --- | --- |
| 1. Audit Scheduled Transactions | Complete | Contracts, ownership map, action review, source-confirmed findings, and performance assessment. |
| 2. Validate Scheduled Transactions | Not started | Existing suite executed. No actual-service posting, save, skip, or payment-link regressions yet. |
| 3. Review findings and policies | Pending | Agree which edit preserves the next date, which due period one payment closes, and whether subscription history must commit with the ledger row. |
| 4. Remediate findings | Not started | No production changes in this pass. |
| 5. Feature sign-off | Pending | Financial parity, failure recovery, localization, privacy, and measured device performance. |

### Evidence used

| Check | Result in this pass | What it establishes / limits |
| --- | --- | --- |
| `node --test --test-reporter=spec src/modules/scheduled-transactions/__tests__/*.test.cjs` | **18 passed**, zero failures/skips; approximately 0.9 seconds | Recurrence math, weekend policies, list filters, search text, schema constraints, orphan reconciliation, and default-account selection. The “advance posting” test checks `calculateScheduleOccurrence` only. It does not call `advancePostScheduledTransaction`, `saveScheduledTransaction`, `postScheduledOccurrence`, or `resolveScheduleOccurrencePaidInContext`. |
| `npx tsc --noEmit` | **Passed, exit 0**; approximately 37 seconds | The current tree typechecks. This does not cover the missing posting and save cases above. |
| Source tracing | Route, screen, form, hook, processor, services, repository, schema, and subscription/calendar callers | Establishes the execution paths below. Findings are source-confirmed unless an earlier audit already executed them. Native taps and frame timing were not measured. |
| Earlier executable review | [S02](../../V1_8_0_v4_SCREEN_BY_SCREEN_FLOW_AUDIT.md) and subscription findings B01/B02 | A notes-only subscription edit was reproduced as moving a May next date back into February processing. This pass confirms the schedule save still implements that reset. |

## 2. What Scheduled Transactions should guarantee

1. A schedule describes future occurrences. It does not move money until Post, automatic posting, or Advance post creates one ledger transaction for one occurrence.
2. Skip records no income, expense, or transfer. Repeating Post or catch-up on an occurrence that already has a posting must not create a second ledger row.
3. The next nominal date stays where the user left it when they change only the name, note, account label, or other non-recurrence fields. Recurrence fields change the future sequence only from the agreed edit anchor.
4. One external payment, including Subscriptions Mark Paid, closes one intended period: one ledger row, one posting link, and one step of the schedule cursor.
5. A subscription-linked post updates subscription history in the same database transaction as the ledger row. If that history write fails, the ledger row is not kept.
6. Pause, end, archive, and restore do not delete posted history. Restore of an active schedule leaves a real next date, or it stays paused/completed with that fact visible.
7. Failed automatic posting stays retryable from the due list. A retry posts once. Catch-up does not walk backward through already posted dates.
8. Amounts stay integer minor units. Transfers stay positive and same-currency. Income and expense keep their sign, including a refund-style positive expense.
9. Closed forms do no domain work. The visible due list is paged. Calendar and search do not need every historical occurrence body to show one month or one match.
10. Local posting never waits for Drive. Privacy mode masks amounts on the schedule list and due cards. English, Filipino, and Spanish cover the visible labels.

### Independent money example

Use PHP, a monthly expense named Rent, category Bills, amount `-10000` (PHP 100), `autoPost` off, start **1 February 2026**, and no weekend shift.

| Operation | Ledger effect | Occurrence | Next due |
| --- | --- | --- | --- |
| Create | None | None stored yet | 1 February 2026 |
| Post February | One expense, **PHP 100** out | February `posted`, one posting | 1 March 2026 |
| Skip March | None | March `skipped`, no posting | 1 April 2026 |
| April automatic post fails, then Post is tapped once | Exactly one April expense | April `posted`, one posting | 1 May 2026 |
| Edit the note only on 20 April | None | Posted and skipped rows unchanged | Still **1 May 2026** |

Current save behavior does not keep that May date. With `nextOccurrenceNumber` 4 and anchor 1, May is sequence 4. Save replaces the anchor with 4 and recalculates sequence 4 as ordinal 1, which is **1 February 2026**. Catch-up then treats February as due again.

## 3. Where the behavior lives

| Layer / consumer | Files | Responsibility |
| --- | --- | --- |
| Route and public entry | [scheduled.tsx](../../src/app/transactions/scheduled.tsx), [index.ts](../../src/modules/scheduled-transactions/index.ts) | Thin route adapter and deferred public exports. |
| Screen | [scheduled-transactions-screen.tsx](../../src/modules/scheduled-transactions/screens/scheduled-transactions-screen.tsx) | Search, filters, due cards, schedule cards, pause/end/archive/restore, and advance-post entry. |
| Form and advance modal | [scheduled-transaction-form-modal.tsx](../../src/modules/scheduled-transactions/components/scheduled-transaction-form-modal.tsx), [advance-post-modal.tsx](../../src/modules/scheduled-transactions/components/advance-post-modal.tsx) | Create/edit input and the early-post date choice. The form returns before its content when closed. |
| Due card | [scheduled-occurrence-card.tsx](../../src/modules/scheduled-transactions/components/scheduled-occurrence-card.tsx) | Post, skip, and failed-state presentation. |
| Hook | [use-scheduled-transactions.ts](../../src/modules/scheduled-transactions/hooks/use-scheduled-transactions.ts) | Focus read, catch-up request, paged due rows, and mutation wrappers. |
| Background processor | [scheduled-transactions-processor.tsx](../../src/modules/scheduled-transactions/components/scheduled-transactions-processor.tsx) | Cold start, resume, and catch-up requests. Also reconciles schedules whose subscription row is gone. |
| Post / skip / catch-up | [process-due-schedules.service.ts](../../src/modules/scheduled-transactions/services/process-due-schedules.service.ts) | Occurrence identity, ledger posting, failure records, and staged catch-up. |
| Save | [save-scheduled-transaction.service.ts](../../src/modules/scheduled-transactions/services/save-scheduled-transaction.service.ts) | Validation, anchor, next date, and pending-snapshot refresh. |
| Advance post | [advance-post-schedule.service.ts](../../src/modules/scheduled-transactions/services/advance-post-schedule.service.ts) | Posts the next occurrence before it is due and advances one step. |
| External payment | [resolve-schedule-paid.service.ts](../../src/modules/scheduled-transactions/services/resolve-schedule-paid.service.ts) | Called by Subscriptions after Mark Paid. |
| Lifecycle | [manage-scheduled-transaction.service.ts](../../src/modules/scheduled-transactions/services/manage-scheduled-transaction.service.ts) | Pause, end, archive, restore, permanent delete, and category reassignment. |
| Calendar projection | [get-calendar-schedules.service.ts](../../src/modules/scheduled-transactions/services/get-calendar-schedules.service.ts) | Recorded rows plus up to 100 future projections per active schedule. |
| Recurrence | [recurrence.ts](../../src/modules/scheduled-transactions/utils/recurrence.ts) | Zoned dates, month-end clamp, weekend policy, and English recurrence labels. |
| Persistence | [scheduled-transactions.repository.ts](../../src/modules/scheduled-transactions/repositories/scheduled-transactions.repository.ts), [transaction-schedules.ts](../../src/infrastructure/database/schema/transaction-schedules.ts) | Schedules, occurrences, postings, checks, and the actionable partial index. |
| Subscription caller | [save-subscription.service.ts](../../src/modules/subscriptions/services/save-subscription.service.ts), [record-subscription-payment.service.ts](../../src/modules/subscriptions/services/record-subscription-payment.service.ts) | Every subscription save rewrites the linked schedule. Mark Paid calls the paid-occurrence resolver and ignores its failure. |
| Staging | [staged-transaction.ts](../../src/infrastructure/database/staged-transaction.ts) | Catch-up copies the database, records writes, then replays them if the live file did not change. |

Screens and components do not call Drizzle. Cross-module callers use `@/modules/scheduled-transactions`. Ledger writes go through `@/modules/transactions`. Subscription history goes through `@/modules/subscriptions`.

## 4. Action-by-action audit

| Action | Current execution path / behavior | Assessment |
| --- | --- | --- |
| Open or focus the screen | The hook defers one read, starts `processDueSchedulesAsync`, loads every schedule including archived rows, then loads 101 actionable occurrences. | The due list is bounded. The template list is not. Opening the screen can post money. See ST-F05 and ST-F06. |
| App start or resume | The root processor reconciles orphan subscription schedules once, then runs catch-up. Resume waits 1 second and yields until interactions finish. | The stagger matches the resume rule. Orphan repair is a write on startup. Catch-up still copies the database per batch. |
| Create | Save validates the account, pocket, category, and same-currency transfer, then stores anchor 1 and the first occurrence. | The create path matches the contract. Transfers reject a second currency in the service. |
| Edit note, name, or other non-recurrence fields | Save sets `anchorOccurrenceNumber` to the current `nextOccurrenceNumber` and recalculates that sequence as ordinal 1 from `startsAt`. | This rewinds the next date to the original start. ST-F01. Subscription saves always pass `firstBillingDate` as `startsAt`, so a notes-only subscription edit uses the same path. |
| Edit recurrence on purpose | The same reset treats the submitted start as a new ordinal-1 date at the current sequence number. | Acceptable only after an explicit policy. It must not run for a note/name edit. |
| Automatic catch-up | Up to eight due schedules run on a private database copy. One failure rolls the batch back, then one occurrence is recorded as `failed` on the live database and the cursor advances. | Idempotent when the nominal date or sequence already exists. A failed row is not retried automatically. The copy cost is ST-F06. |
| Post a due or failed card | `postScheduledOccurrence` writes one ledger transaction, one or two posting rows for a transfer, marks the occurrence posted, and emits `FINANCE_APP_TRANSACTION_MUTATED`. | The occurrence status guard blocks a second post. Subscription history failure is ignored. ST-F03. |
| Skip | Sets the occurrence to `skipped` with no ledger write. | Matches the contract. Other mounted screens are not notified; the local hook refreshes. |
| Advance post | Posts the current next occurrence using the chosen date, then advances one step. The button is hidden for subscriptions, archived rows, and dates that are already due. | The following-cycle preview uses sequence + 1, which is the date after this post. The service emits no transaction event, so Transactions and Dashboard can stay stale. ST-F04. |
| Mark Paid in Subscriptions | Creates one expense and one subscription payment, advances the renewal, then marks every unprocessed schedule occurrence posted with that same transaction id and advances the schedule by one. | The posting table allows one ledger row on only one occurrence. The second link throws, and the payment service swallows it. ST-F02. |
| Pause / resume | Pause deletes occurrences that have no `processedAt`. Resume runs one synchronous due step and requests catch-up. | Posted history remains. A large backlog still depends on staged catch-up. |
| End | Sets `completed` and clears the next dates. Existing due cards are not removed. | Post can still record a card that was already due. Confirm that this is intentional. |
| Archive / permanent delete | A schedule with postings is archived and its unprocessed occurrences are deleted. A schedule without postings is deleted. Permanent delete removes the schedule row. Occurrences and postings cascade. | Posted ledger rows remain. Archive stores a null next date. |
| Restore | Clears `archivedAt` and, for a completed row, sets `active` again. It keeps the stored next date, including null. | An archived posted schedule becomes active and never due. ST-F07. |
| Delete a category | `reassignScheduledTransactionCategoryReferences` updates schedule rows and due/failed snapshots that still name the old category. | The public service is the right boundary. Posted snapshots stay historical. |
| Calendar month | Loads every non-archived schedule and every occurrence, then projects at most 100 future steps per active schedule inside the visible window. | The month window is applied in JavaScript. ST-F05. |
| Search and filters | Search runs in memory over the loaded schedules, including account and category names. | No per-keystroke SQL. The search set is the full template list from focus. |

## 5. Independent checks

These rows are calculated from the current functions and constraints. This pass did not execute `saveScheduledTransaction` or `resolveScheduleOccurrencePaidInContext` against SQLite. The schedule suite does not cover them.

| Probe | Inputs | Expected | What the current code does |
| --- | --- | --- | --- |
| Note-only edit | Monthly rule, start 1 Feb 2026, anchor 1, `nextOccurrenceNumber` 4 (1 May 2026). Save the same start and a new note. | Next remains 1 May 2026. Anchor stays 1. No ledger row. | [save-scheduled-transaction.service.ts](../../src/modules/scheduled-transactions/services/save-scheduled-transaction.service.ts) sets the anchor to 4. Ordinal is `4 - 4 + 1 = 1`, so the next nominal date becomes 1 Feb 2026. |
| Two due occurrences, one Mark Paid | February and March are `due` and unprocessed. One payment inserts transaction `T`. | One occurrence links to `T`. The other stays due, or the product defines a single oldest period and advances once. | [resolve-schedule-paid.service.ts](../../src/modules/scheduled-transactions/services/resolve-schedule-paid.service.ts) marks both posted and inserts `T` twice. [transaction_schedule_postings_transaction_unique](../../src/infrastructure/database/schema/transaction-schedules.ts) rejects the second insert. [record-subscription-payment.service.ts](../../src/modules/subscriptions/services/record-subscription-payment.service.ts) catches that error. The renewal update above the catch still commits. |
| Subscription history failure during auto-post | Ledger insert succeeds. `handleSubscriptionScheduleExecutedInContext` throws. | The ledger row and the occurrence stay unposted. | The `try/catch` in `processNextOccurrence` and `postScheduledOccurrence` discards the error and continues. The ledger row remains. |
| Advance post while Transactions is open | Post the next rent early from this screen. | The Transactions list shows the new expense without leaving and reopening. | `advancePostScheduledTransaction` never emits `FINANCE_APP_TRANSACTION_MUTATED`. The schedule hook only reloads its own lists. |
| Restore after archive | Archive a schedule that has a posting. `nextNominalAt` is null. Restore it. | Either a computed next date, or a still-completed schedule. | `restoreScheduledTransaction()` sets `active` and copies the null next date. Due selection requires `nextEffectiveAt <= now`, so this row is never selected. |

## 6. Prioritized findings

P1 means a posted amount, a missed period, or a duplicate period. P2 means refresh, scale, recovery, privacy, or localization. Nothing below is fixed in this pass.

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| ST-F01 | P1 | **Fix:** Editing an existing schedule rebuilds the next date from the original start. | Was `anchorOccurrenceNumber = nextOccurrenceNumber` on every update. **Fixed:** preserve anchor, next sequence, and next dates when recurrence fields are unchanged; re-anchor only on recurrence edits. Regression: `save-scheduled-transaction-remediation.test.cjs`. |
| ST-F02 | P1 | **Fix:** One payment is applied to every pending occurrence, then the unique posting index stops the rest. | Was a loop over all pending plus swallowed errors in Mark Paid. **Fixed:** link oldest pending only, idempotent by `transactionId`, schedule sync fails the payment transaction. Regression: `resolve-schedule-paid-remediation.test.cjs`. |
| ST-F03 | P1 | **Fix:** Subscription history errors are ignored after the ledger post. | Was empty `catch` around `handleSubscriptionScheduleExecutedInContext`. **Fixed:** subscription sync errors roll back the post transaction; missing subscription throws. Regression: `subscription-schedule-post-sync.test.cjs`. |
| ST-F04 | P2 | Advance post does not tell other screens that a transaction was saved. | Service ends after `db.transaction`. Manual Post emits the mutation event. Advance post does not. |
| ST-F05 | P2 | Calendar reads every schedule and every occurrence, then filters the month in JavaScript. | `getCalendarScheduleOccurrences` calls `listScheduledTransactions` and `listScheduleOccurrences()` with no date predicate. Projection stops at 100 steps per schedule. |
| ST-F06 | P2 | Focus and catch-up do more work than the visible page. | The hook passes `hasCachedResult: false`, so each refresh clears due rows. Catch-up serializes the database once per batch of eight. The template query has no limit. |
| ST-F07 | P2 | Restore can turn an archived schedule back on without a next date. | Archive clears `nextNominalAt`. Restore of a completed row forces `active` and keeps that null. |
| ST-F08 | P2 | Amounts, status, and recurrence text stay in English, and amounts ignore privacy mode. | Cards render `active`, `Paused`, `Auto-post`, `Due:`, and `formatScheduleRecurrence`. No privacy-mode hook is used in this module. |

### ST-F01 — Save rewinds the next occurrence (**Fix**)

- **Status:** **Fixed** in `save-scheduled-transaction.service.ts` (metadata-only saves preserve recurrence cursor; service tests in `save-scheduled-transaction-remediation.test.cjs`).
- **Problem:** A schedule whose next date is 1 May 2026 returns to 1 February 2026 when the user changes the note and leaves the start date alone. Catch-up can then walk already posted February, March, and April rows by nominal date and post the first date that does not already exist.
- **Cause:** [save-scheduled-transaction.service.ts](../../src/modules/scheduled-transactions/services/save-scheduled-transaction.service.ts) replaces the stored anchor with `nextOccurrenceNumber` on every update. `calculateScheduleOccurrence` treats that sequence as ordinal 1, so the nominal date is `startsAt`. [save-subscription.service.ts](../../src/modules/subscriptions/services/save-subscription.service.ts) sends `firstBillingDate` as `startsAt` on every subscription save, including a notes-only edit.
- **Smallest fix:** Keep the stored anchor and the stored next sequence when the recurrence fields did not change. Recalculate from the existing anchor only when start, frequency, interval, end, or weekend policy changes. Refresh unprocessed snapshots’ amounts and notes without moving their nominal dates.
- **Regression proof:** February start, three posted months, next date in May, note-only save, assert May and anchor 1. A real frequency change may move the future sequence. A subscription notes-only save must not call catch-up on February. No new ledger row in either notes-only case.

### ST-F02 — One payment cannot close several due occurrences (**Fix**)

- **Status:** **Fixed** in `resolve-schedule-paid.service.ts` and `record-subscription-payment.service.ts` (tests in `resolve-schedule-paid-remediation.test.cjs`).
- **Problem:** Two overdue manual occurrences and one Mark Paid should change one period. The resolver marks every unprocessed occurrence posted and inserts the same `transactionId` for each. The second insert violates `transaction_schedule_postings_transaction_unique`. The payment service catches that error, so the subscription renewal can commit while the schedule cursor and the remaining due card do not match it.
- **Cause:** [resolve-schedule-paid.service.ts](../../src/modules/scheduled-transactions/services/resolve-schedule-paid.service.ts) loops all unprocessed rows, then always advances `nextOccurrenceNumber + 1`. The unique index is in [transaction-schedules.ts](../../src/infrastructure/database/schema/transaction-schedules.ts). The `try/catch` is in [record-subscription-payment.service.ts](../../src/modules/subscriptions/services/record-subscription-payment.service.ts).
- **Smallest fix:** Choose the single oldest unprocessed occurrence, link that one row, and advance one step. If none is waiting, advance only when the product rules say this payment is the next period, and insert one occurrence for that period. Do not catch a constraint failure inside the money transaction.
- **Regression proof:** Zero, one, and two due occurrences. Assert one ledger row, one posting, one posted occurrence, and a cursor exactly one step ahead. A repeated call with the same transaction id must not add a second posting.

### ST-F03 — Subscription history can diverge from the ledger post (**Fix**)

- **Status:** **Fixed** in `process-due-schedules.service.ts` and `handleSubscriptionScheduleExecutedInContext` (tests in `subscription-schedule-post-sync.test.cjs`).
- **Problem:** Automatic or manual post can leave a rent expense in the ledger and on the occurrence, with no subscription payment row and no moved renewal date.
- **Cause:** `processNextOccurrence` and `postScheduledOccurrence` catch errors from `handleSubscriptionScheduleExecutedInContext` and continue. The comment says auto-post should keep working if the subscription record cannot be updated.
- **Smallest fix:** Let that error leave the database transaction. The ledger insert, posting, occurrence status, and subscription history commit together or not at all.
- **Regression proof:** Force the subscription update to throw. Assert no new transaction, no posting, and the occurrence still `due` or `failed`. A successful post asserts one payment row and one renewal step.

### ST-F04 — Advance post does not refresh the ledger screens

- **Problem:** Advance post writes a real transaction. Transactions and Dashboard listen for `FINANCE_APP_TRANSACTION_MUTATED`. This path does not emit it, so those screens can keep the old list until the user opens them again.
- **Cause:** [advance-post-schedule.service.ts](../../src/modules/scheduled-transactions/services/advance-post-schedule.service.ts) commits and returns. [postScheduledOccurrence](../../src/modules/scheduled-transactions/services/process-due-schedules.service.ts) emits after its commit. The hook reloads schedules only.
- **Smallest fix:** Emit `FINANCE_APP_TRANSACTION_MUTATED` with a schedule source id after a committed advance post, matching manual post.
- **Regression proof:** A hook or service test can assert the emit once. On device, leave Transactions open, advance-post from Scheduled Transactions, and return to find the new row without a manual reload.

### ST-F05 — Calendar loads the full schedule history

- **Problem:** A one-month calendar view reads every non-archived template and every occurrence ever stored, including posted months outside the window.
- **Cause:** [get-calendar-schedules.service.ts](../../src/modules/scheduled-transactions/services/get-calendar-schedules.service.ts) calls `listScheduleOccurrences()` with no schedule id and no date bounds, then keeps rows whose effective time falls in the window. Each active schedule may calculate up to 100 following occurrences.
- **Smallest fix:** Query occurrences whose effective or nominal time overlaps the requested window, and start projection at `nextOccurrenceNumber` only until the window ends. Keep the 100-step cap for a very short frequency.
- **Regression proof:** Seed occurrences outside the month and assert they are not returned. Assert the SQL statement count stays flat when old posted rows grow. A daily schedule still stops at the cap instead of scanning years.

### ST-F06 — Refresh and catch-up exceed the frame budget

- **Problem:** Every focus and every `FINANCE_APP_SCHEDULES_CHANGED` event hides the due list and can copy the entire database.
- **Cause:** [use-scheduled-transactions.ts](../../src/modules/scheduled-transactions/hooks/use-scheduled-transactions.ts) calls `runDeferredSyncQuery({ hasCachedResult: false })`, and the returned `occurrences` are `[]` while `loading` is true. The same refresh calls `processDueSchedulesAsync`. That worker uses [withStagedDatabaseTransaction](../../src/infrastructure/database/staged-transaction.ts), which serializes the database, runs at most eight occurrences, and replays the writes. `listScheduledTransactions({ includeArchived: true })` has no limit. `setTimeout(0)` yields between occurrences; it does not make the copy cheap.
- **Smallest fix:** Keep the previous due page on screen while a refresh runs. Do not start a second catch-up from a refresh that the catch-up itself triggered. Leave the staged batch as the posting mechanism until a per-occurrence transaction is measured against the same failure and restart cases.
- **Regression proof:** Count SQL and record that a second `SCHEDULES_CHANGED` during an active catch-up does not serialize the file twice for the same batch. A 1,000-schedule fixture must not hydrate posted occurrence history onto this screen.

### ST-F07 — Restore activates a schedule that has no next date

- **Problem:** Archiving a schedule that already posted clears the next date. Restore shows it as active and “No future occurrences,” and catch-up never selects it.
- **Cause:** [removeScheduledTransaction](../../src/modules/scheduled-transactions/services/manage-scheduled-transaction.service.ts) sets `nextNominalAt` and `nextEffectiveAt` to null. [restoreScheduledTransaction](../../src/modules/scheduled-transactions/services/manage-scheduled-transaction.service.ts) turns a completed row back to `active` and copies those null dates. The screen calls `restore(id)` with no replacement date.
- **Smallest fix:** On restore to active, recalculate the next occurrence from the preserved anchor and start, skipping sequences that already have occurrences. If none remain, restore it as completed and say so.
- **Regression proof:** Post once, archive, restore. Assert either a future `nextEffectiveAt` or status `completed`. Due processing must not insert a second posting for the original period.

### ST-F08 — Visible copy and amounts are not ready for localization or privacy mode

- **Problem:** A Filipino or Spanish user still sees English status and recurrence text. Privacy mode still shows the rent amount on this screen.
- **Cause:** [scheduled-transactions-screen.tsx](../../src/modules/scheduled-transactions/screens/scheduled-transactions-screen.tsx) and [scheduled-occurrence-card.tsx](../../src/modules/scheduled-transactions/components/scheduled-occurrence-card.tsx) render raw status, “Scheduled transfer”, “Auto-post”, “Confirm each”, “Next:”, “Due:”, “Unknown”, and “No category”. [formatScheduleRecurrence](../../src/modules/scheduled-transactions/utils/recurrence.ts) returns English only. The module never reads privacy mode. Some buttons already use `t(...)`.
- **Smallest fix:** Move the remaining visible strings into `en.ts`, `fil.ts`, and `es.ts`. Format recurrence through the same dictionaries. Mask amounts with the existing privacy helper used by other ledger screens.
- **Regression proof:** Dictionary parity for the new keys, and a render check that privacy mode replaces the amount with the hidden label on both the schedule card and the due card.

## 7. Policy questions

These need a decision before the related code changes. They are not extra engines.

| Topic | Current behavior | Decision needed |
| --- | --- | --- |
| Note-only edit | Rewinds the next date to the start and replaces the anchor. | Keep the next date and anchor when start, frequency, interval, end, and weekend policy are unchanged. |
| Intentional recurrence edit | Uses the submitted start as a new ordinal 1 at the current sequence. | Confirm that a changed start replaces only future occurrences and does not repost existing nominal dates. |
| Several due periods, one Mark Paid | Tries to close all of them with one transaction id. | Close the oldest waiting period only. |
| Subscription history failure | Ledger post is kept. | Roll the ledger post back with the history write. |
| End versus an already due card | End clears the future cursor but leaves the due card postable. | Confirm that a due card created before End may still be posted once. |
| Failed auto-post | The cursor moves on. The failed card stays for a manual Post. | Confirm that catch-up must not retry a failed occurrence by itself. |
| Advance-post date | The ledger date can be today while the occurrence identity stays the scheduled period. | Confirm that this is an early posting of that period, not an extra period. |
| Privacy | Amounts are visible. | Mask this screen the same way as other glanceable money lists. |

## 8. Runtime performance assessment — 60–120fps

**No device frame rate is claimed.** A 60Hz frame allows about 16.6ms of JavaScript work. A 120Hz frame allows about 8.3ms. The 18 passing tests do not measure either.

### Will this block the JavaScript thread?

Yes, on the paths that post or open the calendar. Catch-up yields with `setTimeout(0)` between occurrences, but each batch first serializes the whole database file on a native connection. That copy is not bounded by the eight-occurrence cap. The synchronous `processDueSchedules` path used after some subscription saves runs one occurrence inside `db.transaction` on the caller’s turn. Calendar projection and the schedule screen’s `.map` run on the JavaScript thread after the queries return. Search itself does not query.

### Will this re-render unrelated screens?

The root processor mounts for the whole app and correctly renders null. It does not subscribe to the current route. A committed catch-up emits `FINANCE_APP_TRANSACTION_MUTATED` with source `schedule-catch-up`, so focused ledger screens refresh once per batch. Those screens do not all share one combined state-and-dispatch context. Advance post emits nothing, so it fails the other way: open ledger screens stay stale. The schedule hook also reloads itself on every `FINANCE_APP_SCHEDULES_CHANGED`, including events from its own catch-up.

### How many synchronous reads run on focus?

For an ordinary open with due rows:

1. One due-schedule probe, `LIMIT 1`, before catch-up staging.
2. One unbounded `listScheduledTransactions` read, including archived templates.
3. One actionable occurrence read, `LIMIT 101`, using `schedule_occurrences_actionable_index`.
4. One `EXISTS` query for schedules that have any posting.

That is a small statement count, not a small amount of work. Statement 2 grows with every template. Catch-up then adds a full-file copy and the ledger writes for up to eight occurrences, including credit-card reconciliation for the touched accounts. Complexity of the visible due page is O(1) rows with a fixed page size. Complexity of catch-up is O(backlog) batches, and each batch copies the database. Calendar adds O(all occurrences + 100 projections per active schedule).

### What already matches the frame rules

- The form returns `null` before its hooks when `visible` is false.
- Due rows use a keyset of nominal date plus id and a page of 100.
- Posting ids are chunk-free because each post links one or two rows.
- Category reassignment updates due and failed snapshots only, not posted history.
- The due index is a partial index on `status IN ('due', 'failed')`.
- Resume processing waits 1 second and is cancelled on background.
- Style factories for the screen, form, cards, and advance modal sit at module scope.
- Search does not query SQLite per character.

### What does not

- `hasCachedResult: false` plus `occurrences: loading ? []` hides the current due page on every refresh. There is no separate skeleton that keeps the old rows.
- Schedule cards are not memoized. The list is a `ScrollView` map with `accounts.find` and new arrow functions per row.
- The advance modal’s early return is `if (!schedule)`, after its state hooks. Those hooks do not query. Pass a null schedule when the modal is closed, which the screen already does.
- `listDueManualOccurrences` has no caller. Do not build a second due path around it.

## 9. Database relationships, offline behavior, and necessary complexity

Three tables are required. `transaction_schedules` is the template and the cursor. `transaction_schedule_occurrences` is one period, unique per schedule plus sequence and per schedule plus nominal time. `transaction_schedule_postings` links that period to ledger rows, with one ledger transaction allowed on only one occurrence. Deleting a schedule cascades its occurrences and postings. Deleting a ledger transaction cascades its posting link. The ledger row is still the financial source of truth.

Occurrence identity is necessary. Without it, a restart after a failed batch could post February twice. The staged copy exists so a batch can yield without holding a live write transaction across timers. That machinery is justified only while it stays the single catch-up path. A simpler per-occurrence `db.transaction` is the candidate replacement after ST-F01 through ST-F03 have tests, not before.

Weekend shift, month-end clamp, and failed-versus-due status earn their keep. They are covered by the current recurrence tests. The full template load, the full occurrence load on the calendar, and the unused `listDueManualOccurrences` helper do not.

All three tables are registered in [user-data-tables.ts](../../src/infrastructure/database/user-data-tables.ts) and the backup snapshot. Posting does not wait for a network request. Quick Sync can still run later from the ledger mutation. This audit does not add a schedule-specific remote queue.

Account deletion is restricted while a schedule points at the account. Category reassignment goes through the schedule service rather than a direct category-table write from another feature. That boundary should stay.

## 10. Stage 2 regression expansion

Add these as executions of the real services against migrated SQLite, not as copies of the date math.

| Case | Assert |
| --- | --- |
| Note-only save | May next date, original anchor, zero new transactions. |
| Subscription notes-only save | Same next date on the linked schedule and the subscription renewal. |
| Changed start date | Future cursor follows the new rule and does not insert a second posting for an existing nominal date. |
| Post, skip, post the next | Two ledger rows, one skipped occurrence, no posting on the skip. |
| Double post and catch-up retry | One ledger row and one posting. |
| Failed post then manual retry | One ledger row after the successful retry. |
| Two due occurrences and one Mark Paid | One posting, one posted occurrence, cursor plus one, thrown errors not swallowed. |
| Subscription history throws | No ledger row, occurrence unchanged. |
| Advance post | One ledger row at the chosen date, cursor plus one, mutation event emitted once. |
| Archive and restore | No duplicate posting; next date exists or the status stays completed. |
| Pause | Unprocessed due rows gone; posted rows remain; resume does not repost them. |
| Calendar window | Rows outside the month are not loaded. Statement count stays flat as old occurrences grow. |
| Privacy and strings | Hidden amount in privacy mode. New keys exist in English, Filipino, and Spanish. |

Also keep the current 18 tests. They lock month-end, 29 February, weekend policies, and the amount checks. They are not a substitute for the rows above.

## 11. Mandatory pre-change gate for remediation

This audit changed no production code. Before each fix, answer the four questions against the finding being changed:

1. **What is the actual problem?** Use the fixture in Section 5 or add a failing service test that shows the wrong date, the extra posting, or the missing event.
2. **Why does the current implementation cause it?** Name the function in Section 6 and the caller, including the transaction and the `catch` that keeps a partial result.
3. **What is the smallest reasonable fix?** Use the localized change in that finding. Do not replace catch-up, add a second recurrence engine, or refactor the screen while fixing a date or a posting link.
4. **How will we prove other features remain correct?** Run the new case, the existing 18 tests, the subscription payment tests, and `npx tsc --noEmit`. Posting, skip, and advance post must still create the ledger totals already guaranteed by Transactions.

When a fix changes what the user can see or recover, add the release-note line in English, Filipino, and Spanish and ask whether to keep v1.8.0 or bump the patch version and Android version code. This audit document does not by itself require that bump.

## 12. Feature sign-off checklist

- [x] Map routes, screen actions, services, schema, and subscription/calendar callers.
- [x] Run the existing Scheduled Transactions tests: 18 passed.
- [ ] Add service-level regressions for save, post, skip, retry, Mark Paid, and advance post.
- [x] Fix ST-F01 so a non-recurrence edit keeps the next date.
- [x] Fix ST-F02 so one payment links one occurrence.
- [x] Fix ST-F03 so subscription history commits with the ledger row.
- [ ] Fix ST-F04 so advance post refreshes open ledger screens.
- [ ] Bound calendar occurrence reads (ST-F05).
- [ ] Stop clearing the due list on every refresh and record the catch-up copy cost (ST-F06).
- [ ] Restore a next date or keep the schedule completed (ST-F07).
- [ ] Localize the remaining labels and mask amounts in privacy mode (ST-F08).
- [ ] Agree the Section 7 policies.
- [ ] `npx tsc --noEmit` after the production fixes.
- [ ] Release-device frame timing for open, catch-up, and calendar month change.

**Current decision:** **NOT READY FOR FEATURE SIGN-OFF.** The occurrence identity and staged catch-up should stay. The next-date reset, the multi-occurrence payment link, and the swallowed subscription error need fixes and service tests before this feature can be signed off.
