# Subscriptions audit — v1.8.0

**Date:** November 26, 2026 — Asia/Manila  
**Reviewed commit:** `699251f` (working tree initially clean).  
**Stage:** 1 complete; initial Stage 2 probes executed. Review, remediation, durable regression expansion and native acceptance remain open.  
**Result:** **NOT READY FOR FEATURE SIGN-OFF.** Four executable financial/lifecycle defects remain, plus recovery, refresh, performance and layout findings. No production fix applied.

**Changes made:** This report, an audit-only reproduction script, the shared checklist, and scoped layout reopenings in the previous reports. No application code, migrations, versions or release notes changed. No commit created.

## 1. Workflow, prior evidence and scope

Follow the existing five stages: audit → validate → review findings/policies → remediate → sign off. Use the [shared audit checklist](../AUDIT_CHECKLIST.md), including the new text containment/reflow criterion, and AGENTS.md Sections 17–21.

The [Calendar audit](calendar-audit-v1.8.0.md#12-next-feature-to-audit) recommended Reports followed by Subscriptions. This pass selects Subscriptions first because it still owns payment/renewal and denomination risks across Scheduled Transactions. **Reports remains the next uncovered feature.** The remaining sequence is in the [manual review and audit queue](text-layout-review-v1.8.0.md#next-feature-audit-order).

The [Scheduled Transactions audit](scheduled-transactions-audit-v1.8.0.md) already resolved oldest-period Mark Paid linking, required history rollback, shared scheduler non-recurrence anchor preservation, and standalone schedule restore. The six related tests rerun here pass. Those fixes do not prove the separate subscription edit/restore orchestrators are correct. The broad [screen review](../../V1_8_0_v4_SCREEN_BY_SCREEN_FLOW_AUDIT.md#7-subscriptions--subscriptions) previously identified B02 denomination divergence; SUB-F04 confirms that issue still exists. Do not create a second unrelated remediation ticket for B02.

| Stage | Status | Deliverable |
| --- | --- | --- |
| Audit | Complete | Contracts, ownership/actions, independent fixtures, prioritized findings and performance assessment. |
| Validate | Partial | Existing suites/typecheck pass; four additional SQLite assertions fail against current production paths. Native layout and scale profiling remain open. |
| Review | Pending | Currency ownership, trials, recurrence edit/restore anchor, lifecycle failure policy, and privacy/accessibility decisions. |
| Remediate | Not started | Apply only reviewed, surgically scoped changes with permanent regressions. |
| Sign off | Blocked by findings | No feature or native layout sign-off claimed. |

### Evidence executed

| Check | Result | Establishes / limits |
| --- | --- | --- |
| `node --test src/modules/subscriptions/__tests__/*.test.cjs` | **21 passed**, 0 failed; about 12 seconds | Date clamp, burn normalization/conversion with explicit rates, validation, focus deferral/cancellation, positive-cost enforcement, category fallback and payment rollback. Native modules are mocked. |
| `node --test src/modules/scheduled-transactions/__tests__/resolve-schedule-paid-remediation.test.cjs src/modules/scheduled-transactions/__tests__/subscription-schedule-post-sync.test.cjs` | **6 passed**, 0 failed; about 12 seconds | Oldest pending link/idempotency, failed-link rollback, subscription history rollback and successful posted history. |
| `node audits/v1.8.0/evidence/subscriptions-audit-probes.cjs` | **9 existing checks passed; 4 added assertions failed**, exit 1; about 10 seconds | Real migrated in-memory SQLite, repositories, subscription save/payment/restore, scheduler save/post/cursors. Confirms SUB-F01–F04. These deliberately failing audit probes are separate from the normal application test suite. |
| `npx tsc --noEmit` | **Passed, exit 0** | Type integrity of the current tree. Does not establish layout or business correctness. |
| Source tracing | Route, screen, hooks, all subscription services/repository/schema/components and scheduler/notification callers | SUB-F05–F06 and F08–F09 are source findings. SUB-F07 is a native-layout risk awaiting manual reproduction. |
| Native UI / release frames / large fixtures | **Not executed** | No screenshots, glyph containment or 60–120fps claim. User manual validation precedes UI fixes. |

Logs from this pass: `%TEMP%/finance-subscriptions-audit-tests.log`, `finance-subscriptions-schedule-regressions.log`, `finance-subscriptions-audit-probes-final.log`, and `finance-audit-types.log`. The [reproduction script](evidence/subscriptions-audit-probes.cjs) preserves executable financial evidence after temporary logs expire. Run it as a standalone Node process because it reuses the existing harness's module mocks. Only in-memory databases are written; native notifications/network are mocked.

SDK 57 reference reviewed: [versioned Expo documentation](https://docs.expo.dev/versions/v57.0.0/). No SDK or dependency change proposed.

## 2. What Subscriptions should guarantee

1. A recurring cost has one explicit denomination. The form, subscription, manual payment, automatic posting and Scheduled Transactions agree on the amount taken from an account.
2. Create/edit alone does not create unintended historical charges. Name/note-only edits preserve the paid-through renewal and shared schedule cursor.
3. One Mark Paid creates one expense/payment and closes one intended period atomically. Required link/history failure rolls everything back; retries do not silently duplicate the same intended action.
4. A displayed trial end agrees with its countdown, reminder date and charging policy. Any distinction between trial start and first paid billing date is explicit.
5. Pause/cancel/archive stops future processing; restore preserves history and leaves the linked schedule operational or visibly paused/completed.
6. Summary excludes archived/paused/cancelled costs according to documented policy; rate source, trial inclusion and yearly rounding are explicit.
7. Failed reads show retryable error state; failed saves preserve drafts; failed deletes/restores preserve a recoverable target. External posts refresh a focused screen.
8. Local work succeeds offline without waiting for Drive. SQL is deferred and bounded, closed modals mount no domain hooks, and typing/navigation stay responsive.
9. Text stays inside its card/field/modal and clear of siblings at narrow widths, large system text and all supported languages. Privacy applies to both visual and spoken values according to an explicit policy.

## 3. Ownership and execution paths

| Layer / consumer | Source | Owns |
| --- | --- | --- |
| Route/public entry | [subscriptions.tsx](../../src/app/subscriptions.tsx), [index.ts](../../src/modules/subscriptions/index.ts) | Thin route/URL adapters and deferred public capabilities. |
| Screen | [subscriptions-screen.tsx](../../src/modules/subscriptions/screens/subscriptions-screen.tsx) | Search/filter counts, mapped cards, pay/create/edit/delete/archive/restore handlers, Pro guards and walkthrough. |
| Forms/presentation | [subscription-form-modal.tsx](../../src/modules/subscriptions/components/subscription-form-modal.tsx), [mark-paid-modal.tsx](../../src/modules/subscriptions/components/mark-paid-modal.tsx), [subscription-card.tsx](../../src/modules/subscriptions/components/subscription-card.tsx), [summary](../../src/modules/subscriptions/components/subscription-burn-rate-summary.tsx), [tabs](../../src/modules/subscriptions/components/subscription-filter-tabs.tsx) | Drafts, pickers, date/currency labels, countdown/actions and summary layout. |
| Hook | [use-subscriptions.ts](../../src/modules/subscriptions/hooks/use-subscriptions.ts) | Deferred cancellable focus read, in-memory filtering and mutation wrappers. Screen still bypasses the hook for save. |
| Save/schedule sync | [save-subscription.service.ts](../../src/modules/subscriptions/services/save-subscription.service.ts) | Validation, upcoming renewal calculation, schedule mapping and atomic subscription persistence. |
| Payment/history | [record-subscription-payment.service.ts](../../src/modules/subscriptions/services/record-subscription-payment.service.ts) | Expense + payment + renewal + schedule resolver in one transaction; public scheduler history callback. |
| Lifecycle | [toggle-subscription-status.service.ts](../../src/modules/subscriptions/services/toggle-subscription-status.service.ts), [delete-subscription.service.ts](../../src/modules/subscriptions/services/delete-subscription.service.ts) | Status, pause, archive/delete/restore and linked-schedule orchestration. |
| Summary/dates | [calculate-burn-rate.service.ts](../../src/modules/subscriptions/services/calculate-burn-rate.service.ts), [renewal-calculator.ts](../../src/modules/subscriptions/utils/renewal-calculator.ts) | Monthly normalization, annual projection, month-end clamp and day difference. |
| Reminders | [schedule-sub-reminders.service.ts](../../src/modules/subscriptions/services/schedule-sub-reminders.service.ts), [sync-all-reminders.service.ts](../../src/modules/notifications/services/sync-all-reminders.service.ts) | Local notification rescheduling and date/copy selection; OS scheduling was mocked, not delivered. |
| Persistence/input | [subscriptions.repository.ts](../../src/modules/subscriptions/repositories/subscriptions.repository.ts), [schema](../../src/infrastructure/database/schema/subscriptions.ts), [input schema](../../src/modules/subscriptions/schemas/subscription.schema.ts) | Joined lists/payment records, foreign keys/indexes, positive integer cost and form constraints. |

Cross-feature financial writes already use public Transactions/Scheduled Transactions/Subscriptions services. Keep that ownership. Fix subscription-specific mapping/restore calls in Subscriptions; a standalone scheduler fix is not automatically required. No new engine, global cache or copied ledger is justified.

## 4. Action-by-action audit

| Action | Current behavior | Assessment |
| --- | --- | --- |
| Open/focus | One cancellable deferred joined list including archived rows; summary derives during render; all filtered cards mount in a ScrollView. | Deferred query good; unbounded paid-user list and no read-error state: F05/F06. |
| Search/filter | In-memory name/account/category search; six separate filter-count passes; no per-keystroke SQL in this hook. | O(S) per input/filter change; rows receive new callback closures. Archive data is always loaded. |
| Create/preset | Form requires positive amount, account and category; service can support accountless tracking. Save creates schedule from first billing date and then attempts one due-processing step synchronously. | Strong amount validation; trial/currency rules need review, F03/F04. Backdated creation can introduce historical due occurrences. |
| Edit name/note/cost | Form omits `nextRenewalDate`; service recalculates it from first billing date/today. Shared scheduler now preserves an unchanged recurrence cursor. | Two representations can diverge: F01. |
| Change account/currency | Amount calculator shows selected account currency, but save prefers existing subscription currency; schedule takes account currency and unchanged magnitude. | Confirmed denomination divergence, F04/B02. |
| Mark Paid | Expense + audit payment + renewal advance + oldest pending schedule resolution are atomic; event emitted after commit without source payload. | Six shared rollback/link tests pass. Missing event subscription on the focused subscription hook leaves external updates stale, F05. |
| Automatic/Post Now/Calendar post | Scheduler writes expense and calls subscription history/renewal callback. | Shared sign and atomicity regressions pass; trial gating and mixed-currency magnitude do not, F03/F04. |
| Trial | Form stores trial end; card derives trial countdown from renewal, reminder service uses renewal, schedule maps first billing date without trial end. | Multiple conflicting dates, F03. |
| Pause/resume/cancel | Lifecycle calls shared pause service in transaction but catches schedule errors; resume also attempts one synchronous due step. | Potential status mismatch and render-blocking work, F06/F08. Cancelled subscriptions still show a pause action; agree desired reactivation behavior. |
| Delete/archive | Payment existence probe decides archive vs permanent delete. Screen probes during render; clears target before operation. Schedule removal errors are swallowed. | Target recovery, render SQL and partial lifecycle concerns, F06/F08. |
| Restore | Rebuilds/saves existing linked schedule, then clears subscription archive. Does not invoke the imported public schedule restore capability. | Confirmed archived schedule with null cursor, F02. |
| Reminders | Cancels existing subscription alerts; schedules active/trial next-renewal offsets within 30 days, with English copy. | Trial date mismatch, F03; localization/recovery coverage needed. Subscription scheduling is called independently of the scheduled-transaction reminder toggle; policy unresolved. |
| Manage online | Opens stored cancellation URL directly. | Validate supported link behavior and surface failure; no native link exercise in this pass. |
| Pro / walkthrough | Create/restore guards count non-archived subscriptions. First-item walkthrough waits after loading. | Limits are enforced at these UI entry points; alternate public service callers need separate policy coverage. Test error/empty interaction blocker before native sign-off. |
| Privacy/layout | Most amounts visually mask, but card accessibility label includes raw formatted amount. Dense rows and fixed modal layout. | F07/F09. |

## 5. Independent financial/lifecycle probes

All fixtures freeze local time to **November 26, 2026 at noon**. Costs are integer minor units. The harness applies actual migrations and uses production service/repository code; its native module/public-boundary mocks are described in the script. These are host logic checks, not native UI automation.

| Probe | Fixture and correct expectation | Executed observation |
| --- | --- | --- |
| SUB-F01 | Monthly PHP 149, first due **Dec 1**. Pay early on Nov 26, advancing renewal to **Jan 1, 2027**. Edit only note with the same first billing date and no explicit next renewal (as the form does). Expect Jan 1 retained. | Subscription renewal resets to **Dec 1, 2026**. UTC evidence: `2026-12-31T16:00:00.000Z` → `2026-11-30T16:00:00.000Z`. Shared schedule cursor remains advanced. |
| SUB-F02 | Create due subscription, process and Post one occurrence, archive the posted schedule and subscription, then call actual `restoreSubscriptionInContext`. Expect non-archived linked schedule with a valid next date, unless explicitly completed. | Linked schedule: `status = active`, `archived_at = 1795665600000`, `next_nominal_at = null`. It remains excluded from active due processing. Probe builds the archived state with actual schedule removal plus subscription archive repository because the reused harness mocks public removal. |
| SUB-F03 | Trial starts Nov 26; trial ends **Dec 10**; PHP 149, auto-post on. Process Nov 26. Under a free-until-trial-end contract, expect no charge. | **One expense/payment before trial end.** Production mapping never receives trial end; card/reminder date source also differs from the stored trial date. Final billing policy still needs agreement. |
| SUB-F04 / B02 | USD 15 (`1500`) subscription with PHP account; compare manual and automatic payment using the same saved cost and local rate book. Expect equal PHP ledger deltas or a validation rejection before either path. | Manual debit **-87750** (PHP 877.50), automatic debit **-1500** (PHP 15). Default quote in this fixture: PHP 58.50/USD. No network quote used. |

The script's four assertions express these expected contracts and intentionally fail. They must not be reported as passing regressions or added to ordinary CI without a remediation plan. Promote them into focused permanent regression tests when implementing each fix.

## 6. Prioritized findings and four-question gates

P1: wrong posted money, wrong paid-through period or lost future charging. P2: recovery, architecture, performance, presentation or privacy/accessibility. Only F01–F04 were executed here; the remaining classifications are explicit below.

### SUB-F01 — P1, reproduced: note-only save rewinds the subscription renewal

1. **Problem/evidence:** Probe preserves January's schedule cursor but subscription renewal falls back to December after an early payment.
2. **Cause/path:** Screen → `handleSaveSubscription` directly → `saveSubscription` → `saveSubscriptionInContext` calls `resolveUpcomingRenewal` before considering the existing record. Form `handleSave` omits next renewal. Scheduler recurrence preservation does not preserve this separate subscription field.
3. **Smallest fix to review:** Load existing state first and retain renewal on non-recurrence edits; define an explicit anchor for intentional recurrence edits. Keep this in the existing save service; no new abstraction/file needed.
4. **Proof required:** Early payment, overdue/unpaid periods, note/name/amount/account edits, intentional first-date/cycle changes, month-end clamp and caller-supplied renewal. Assert subscription and schedule dates together, with unchanged payment/ledger counts on note edits.

### SUB-F02 — P1, reproduced: subscription restore leaves the posted schedule archived

1. **Problem/evidence:** Restore shows subscription active while its linked schedule remains archived with null next date.
2. **Cause/path:** `restoreSubscriptionInContext` calls `syncSubscriptionScheduleInContext`; shared save preserves existing null dates and never clears `archivedAt`. The public `restoreScheduledTransaction` is imported by the lifecycle service but not called. Clearing only the subscription archive does not repair schedule lifecycle.
3. **Smallest fix to review:** Use the owning scheduler's existing public restore capability in the same transaction after synchronizing template fields; preserve paused/cancelled/completed intent and avoid old-date replay. No new restore engine.
4. **Proof required:** Actual archive→restore orchestration with/without payments, active/paused/cancelled and ended schedules, stale/missing schedule IDs, repeated restore and injected failure. Assert archive flags, status, next dates, posting idempotency and unchanged historical ledger.

### SUB-F03 — P1, reproduced behavior / policy open: trial dates disagree with charging/countdown/reminders

1. **Problem/evidence:** Auto-post records a payment Nov 26 despite stored trial end Dec 10. Card says trial ends using `daysUntilRenewal`; reminders use `nextRenewalDate`, not trial end.
2. **Cause/path:** Form stores `trialEndsAt`; schedule sync only maps `firstBillingDate` and cycle. `mapSubscriptionRow` computes days from renewal; `scheduleSubscriptionReminders` similarly schedules renewal offsets.
3. **Smallest fix to review:** Agree trial-start/first-paid-date semantics, then align schedule, renewal, countdown and reminders in existing functions. Avoid adding a second trial processor.
4. **Proof required:** 7/14/30/custom trials, first billing before/on/after trial end, exact expiry midnight, auto-post on/off, Mark Paid, expired/paused/cancelled trial, end-date conflicts, reminder payloads and rollback. If charging before trial end is explicitly intended, change misleading countdown/copy and document that policy rather than accepting hidden disagreement.

### SUB-F04 / existing B02 — P1, reproduced: manual and scheduled payments debit different currencies/magnitudes

1. **Problem/evidence:** Same USD 15 cost yields PHP 877.50 manually versus PHP 15 automatically. Earlier B02 remains open at this candidate.
2. **Cause/path:** Form calculator follows selected account currency but `handleSave` prefers prior subscription currency. Schedule sync passes unchanged integer magnitude; shared schedule save sets `currencyCode = account.currencyCode`. Manual payment instead passes subscription currency through Transactions' FX snapshot service.
3. **Smallest fix to review:** Pick one cost-denomination rule. Either enforce same-currency account/cost with clear validation, or make all posting paths use the same Transactions-owned FX capability and visible amount semantics. Do not relabel historical integers or duplicate FX arithmetic in UI.
4. **Proof required:** Actual account-switch form callback plus manual/Post/auto/Calendar ledger parity; PHP/USD, zero-/three-decimal currencies, custom/current rates, edits and payment-account overrides. Compare account deltas, original currency/amount and FX snapshot, including subscription history. Preserve existing transfer/refund regressions.

### SUB-F05 — P2, source-confirmed: read failure has no retry state and external posts do not refresh the focused list

1. **Problem/evidence:** Hook catches read errors with only `console.warn`; no `error` is returned and screen has no `PageErrorState`. On first failure, empty data can look like no subscriptions. Hook subscribes to neither financial mutation events nor database replacement, so scheduler/Calendar posts can leave count/renewal/summary stale until focus returns.
2. **Cause/path:** `refresh` deferred callback catches and returns; `useFocusEffect` is its only lifecycle trigger. Mutation wrappers refresh only their own hook instance.
3. **Smallest fix to review:** Add hook error/retry state and existing shared error presentation; subscribe/coalesce only while focused, cancel on blur/replacement and preserve skeleton/data atomicity. Emit source IDs through existing event ownership where needed; avoid duplicate self-refresh.
4. **Proof required:** First/warm load failure and retry, external post with screen focused/offscreen, self-payment exactly one refresh, replacement, blur/unmount cancellation, search/filter retention and walkthrough touchability on error.

### SUB-F06 — P2, source-confirmed: render-time SQL, unbounded hydration and unstable row callbacks

1. **Problem/evidence:** Screen computes `targetHasPayments` by calling a SQLite-backed service during every render with a deletion target. List includes all archived rows without LIMIT; ScrollView maps every filtered item. Six counts/filter/summary traverse S items; each card receives new inline action functions, bypassing memo's prop equality.
2. **Cause/path:** `checkHasPayments` → repository `.get()` during render (no explicit SQL `LIMIT 1`); `listSubscriptions({ includeArchived: true })` unbounded joined read; `calculateBurnRateSummary` inside render `useMemo`; mapped callbacks inside screen. Save/resume/restore also call synchronous `processDueSchedules(..., 1)` after commit; that global step can process a different due schedule.
3. **Smallest fix to review:** Resolve archive intent after paint in request handling, using an explicit bounded existence query and authoritative service recheck. Add bounded list/virtualization and lazy archived data where scale warrants; stabilize row callbacks and fold counts into one pass. Reuse existing deferred/catch-up mechanisms instead of a new queue. Preserve first-frame shell/skeletons for all substantive loads.
4. **Proof required:** Zero render SQL and zero live-typing SQL; deterministic paged ordering ending in ID if paging added; query count/row bounds and EXPLAIN at 1/1k/10k items; archived filter correctness; no closed-modal queries; Profiler row updates; release navigation/scroll/save/resume traces. Constant SQL statement count alone does not prove constant cost.

### SUB-F07 — P2, source risk / manual pending: text can exhaust the width of cards and payment modal

1. **Problem/evidence:** Source has non-wrapping competing siblings in card name/badge/amount, metadata/action rows, all three summary rows and Mark Paid selectors/buttons. No device overlap is claimed reproduced.
2. **Cause/path:** `SubscriptionCard.amountCol` is unbounded; `subtextRow`/`actionRow` do not wrap. Summary header/amount/footer rows have no width/reflow budget. Mark Paid selector text has no flex/shrink allocation; its sheet lacks scroll/max-height adaptation for large text/short windows.
3. **Smallest fix to review:** First collect native evidence via **TXT-SUB-01**. Then constrain/reflow only the failing sibling group, grow container height, and retain readable full amounts/actions. Do not hide overflow globally or disable font scaling.
4. **Proof required:** [Shared matrix](../AUDIT_CHECKLIST.md#new-required-check-text-collision-containment-and-reflow), long 100-character valid subscription, long account/pocket/category, large positive cost, translated trial/action chips, Manage + all actions, privacy masks, 320/360 widths and large text. Capture before/after screenshots and keyboard/modal reachability; check stable scrolling.

### SUB-F08 — P2, source-confirmed: lifecycle failures can commit partial intent and lose the confirmation target

1. **Problem/evidence:** Status/archive/delete services catch shared-schedule failures and continue updating subscription state. Screen clears delete/restore target before persistence; status toggle lacks error handling. Save is called directly from screen, bypassing the required hook mutation boundary.
2. **Cause/path:** `setSubscriptionStatusInContext`, `archiveSubscriptionInContext`, `permanentlyDeleteSubscriptionInContext` swallow required orchestration errors; `handleConfirmDeleteOrArchive`/`handleConfirmRestore` clear target first; `handleToggleStatus` does not catch. Screen error toasts use the same success variant as successful actions.
3. **Smallest fix to review:** Distinguish explicitly missing/obsolete links from required mutation failures; propagate required failures through the existing transaction. Keep target until success and present retry/error appropriately. Put save wrapper in existing hook. No general command framework.
4. **Proof required:** Inject each scheduler lifecycle error and verify both subscription and schedule roll back, ledger/history preserved, modal target retained, retry once, no success feedback on error. Test missing links, cancellation, status toggles and Pro restore limits.

### SUB-F09 — P2, source-confirmed: privacy/accessibility and localized presentation gaps

1. **Problem/evidence:** `SubscriptionCard` accessibility label interpolates `formattedAmount` even while visible amount is masked. Reminder titles/bodies are hardcoded English; `/mo`, ordinal/date strings and errors can ignore app language. Mark Paid close icon is 18 + 8 padding + 16 hitSlop = **42×42**, below 44×44; close callbacks do not explicitly dismiss keyboard.
2. **Cause/path:** Mask is applied to visible `displayAmount` but not label; reminder/date helpers use English strings/device locale; `closeBtn` padding 4 and hitSlop 8 with 18px icon. Screen passes direct close callbacks.
3. **Smallest fix to review:** Align spoken amount with agreed privacy policy; localize owning strings/date/count helpers through existing dictionaries; make close target effective 44×44 and dismiss keyboard through existing close path. Do not introduce app-wide font overrides.
4. **Proof required:** Screen-reader output in privacy on/off, en/fil/es exact interpolation/plural/date parity, mocked native reminder payloads and first-tap close with keyboard open. Native accessibility remains untested here.

## 7. Product decisions to settle before fixes

- **Denomination (F04/B02):** Does changing account change the cost currency or convert the same foreign-denominated cost? What does the amount calculator promise? Must saved and per-payment overrides use the same policy?
- **Trial (F03):** Is first billing date the start of the trial or the first paid charge? When should trial status become active, and does monthly burn include trial future cost? Current summary includes trial cost but active pill counts active status only.
- **Edit/restore (F01/F02):** Preserve paid-through period for non-recurrence edits. Choose the anchor for deliberate recurrence changes and overdue restoration; define whether catch-up after archive/resume is allowed.
- **External Mark Paid:** Early payment with no stored occurrence currently advances the cursor without inserting an occurrence/posting link. Define the intended period identity and retry behavior; current resolver idempotency tests cover existing posting links, not an arbitrary repeated new payment command.
- **Reminders/ends:** Subscription reminders run independently of the scheduled-transaction toggle; define user control and duplicate-alert policy. Ended schedules do not automatically cancel subscription status/summary/reminders. Test that distinction before labeling it a defect.
- **Rates/summary:** Hook supplies only default display currency, not the user's saved rate book, so summary falls back to static offline quotes. Decide whether that is an estimate or must match configured rates. Yearly projection is rounded monthly burn ×12, not exact annual invoice sum; label/accept rounding explicitly.
- **Privacy:** Visual subscription values already mask; decide spoken-value parity. Do not inherit Scheduled Transactions' intentional unmasked policy without an explicit subscription decision.

These decisions are not permission to rewrite surrounding modules. Resolve the narrow contract, then implement only supporting changes.

## 8. Runtime performance assessment — 60–120fps

**This audit changes no application runtime behavior.** Synchronous query duration, frame timing, memory and render counts were not measured on native devices. Test-suite duration includes compilation/harness overhead and is not app latency.

| Path | Work / complexity observed in source | Frame implication |
| --- | --- | --- |
| Focus list | One joined subscription SELECT, all S active/archived rows, map O(S); SQL ordering may sort and is not proven covered by current status+renewal index. Currency/walkthrough/preference hooks add separate work, not counted here. | Deferred after paint and cancellable, but still synchronous once started; no bound proving <8.3–16.6ms. |
| Summary/filter/counts | O(S) summary with currency arithmetic on items/base change; O(S) search/filter; six O(S) count passes on item changes. | Summary runs during React render. Large paid-user datasets can block input/navigation. No per-character DB reads in the search hook. |
| Delete confirmation | One payment-existence SELECT per render while target is set, plus any mutation checks; `.get()` without explicit LIMIT. | SQL in render and repeated work during unrelated updates violate the query discipline. |
| Rows | All visible filtered rows mounted in ScrollView; memoized card receives fresh callback functions on parent renders. | Typing/filter changes can re-render/mount many cards. Virtualization/bounds and stable callbacks need native Profiler evidence. |
| Save/status/restore | Synchronous local transaction, then one global due-processing step. Date roll-forward loops over elapsed cycles; shared schedule save may read pending occurrences. | Offline writes are immediate, but full handler cost has no proven frame bound; global processing may add unrelated work. |
| Closed modals | Form and Mark Paid outer guards return before account/category hooks. | Good gating; no need for a replacement modal host. Open forms load picker data without an explicit form-level loading skeleton. |
| Providers/root | No new provider/root subscription proposed; focus query is single-owner and cancellable. | Preserve this; do not fix leaf stale data by invalidating every mounted Stack screen. |

Before any performance remediation, capture statement/row counts, plans and exact-output parity with realistic S, archived items and payment history. Then verify Highlight updates/Profiler, cold/warm open, typing, modal opening, scrolling, external payments and idle/resume on release builds with 1k–10k fixtures. Keep 500-ID chunk limits if adding batched hydration. Avoid new global caches and JS text-measurement loops.

## 9. Database, offline and necessary complexity

- Subscriptions reference account/pocket/category/merchant/schedule with `SET NULL` on deletion. Payment records cascade on subscription or transaction permanent deletion. Archived subscriptions preserve records; permanent deletion can remove subscription payment metadata while leaving ledger expenses. Confirm that history policy explicitly.
- Positive costs and integer minor units are service/schema validated; old zero costs are rejected by payment service. Keep the existing category fallback and atomic expense/payment/renewal/link transaction; the rollback regressions pass.
- Shared schedule/payment identity is necessary for retry/history. Fix mapped currency, dates and restore calls rather than replacing the scheduler or storing duplicate balances.
- No payment/save path awaits remote synchronization. This pass did not exercise Drive sync or backup replacement end to end; those remain consumer regression cases.
- Do not change foreign-domain tables directly to work around these findings. Use existing public services, with optional transaction context, and emit one post-commit event with clear source ownership.

## 10. Regression plan and sign-off

| ID | Required coverage |
| --- | --- |
| SUB-V01 | Promote F01 fixture; compare paid-through renewal/schedule/ledger before and after non-recurrence and recurrence edits. |
| SUB-V02 | Actual archive→restore/status/delete services; archived flag, valid cursor, paused/ended intent, missing link and failure rollback. |
| SUB-V03 | Trial charging/countdown/reminder agreement at midnight, custom expiry, lifecycle transitions and agreed catch-up rules. |
| SUB-V04 | Actual form account-switch plus manual/Post/auto/Calendar currency/amount/history parity, configured rates and currency exponents. |
| SUB-V05 | Read failure/retry, draft/confirmation retention, correct error feedback, pending/repeated taps and focused external mutation/replacement refresh. |
| SUB-V06 | SQL statement/row budgets, render/typing SQL zero, bounded archive/list and index plan at scale, cancellation and stable memoized rows. |
| SUB-V07 | TXT-SUB-01 full native layout matrix, related forms/selectors, long errors, translations, accessibility privacy and close targets. |
| SUB-V08 | Local reminder payload/failure retry and settings policy; preserved ledger/history through category deletion, backup/restore and permanent-delete cases. |

- [x] Read existing audit workflow, architecture and versioned SDK reference.
- [x] Trace ownership, actions, cross-feature writes and consumers.
- [x] Run existing Subscriptions and related scheduler regression suites; typecheck passes.
- [x] Execute four additional financial/lifecycle defect probes and preserve reproducible evidence.
- [x] Add the new text-layout criterion and a concrete manual revisit surface list.
- [ ] Review findings and settle Section 7 policies.
- [ ] Turn confirmed defects into durable focused regressions and remediate surgically after the four-question gate.
- [ ] Validate loading/error/mutation recovery, replacement, offline and reminder behavior.
- [ ] Complete en/fil/es, privacy/accessibility, keyboard and native layout validation.
- [ ] Verify bounded query plans, stable row rendering and sustained release-device 60–120fps.
- [ ] Record final candidate, accepted limitations and explicit feature sign-off.

**Current decision:** Findings documented for review; no fix, release-note update, version bump or commit. After this review/remediation, audit **Reports** next. Documentation-only work does not trigger a version decision; implemented fixes must follow AGENTS.md release/version rules.
