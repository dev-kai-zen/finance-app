# v1.8.0 v2 Pre-Release Audit

**Audit date:** November 21, 2026 (Asia/Singapore)  
**Reviewed commit:** `de29877bbb6b97ea85f70d3545b731eaa23af3bd`  
**Application version:** `1.8.0`, Android `versionCode 22`  
**Inputs:** [Original audit](V1_8_0_PRERELEASE_AUDIT.md), [remediation tracker](V1_8_0_REMEDIATION_PLAN.md), current source, existing tests, and isolated audit probes.

## Production recommendation

**Hold the production release.** The remediation improved the app, and the current automated suite passes, but additional financial correctness, backup safety, and responsiveness defects remain.

The strongest new evidence is:

- A subscription's scheduled payment saves a **positive expense**, increasing the account balance instead of reducing it.
- Re-importing an exported refund changes **+PHP 100 into -PHP 100** while the preview says it is ready.
- An upload already in progress can undo the sync safeguards established by a manual restore.
- A supported 1,000-row paired-transfer preview blocked the desktop JavaScript call for approximately **1.94 seconds**.
- Processing 500 overdue schedule occurrences executed **8,000 SQL statements in one synchronous call**, even with credit-card reconciliation disabled in the probe.

These findings do not mean every user will encounter every problem. They mean the current release still has reachable paths that can produce incorrect balances, incomplete recovery, or long UI stalls. A passing unit suite is insufficient to approve this build for production.

**Scope of changes in this review:** Only this Markdown report was added. Application code, tests, migrations, dependencies, versions, and release notes were not changed. Temporary probe scripts were written outside the repository, under the operating system's temporary directory.

## Verification and limits

| Check | Result | What it establishes |
|---|---|---|
| `npx tsc --noEmit` | PASS, exit 0 | Current TypeScript integrity |
| `npm test` | PASS: 614/614, no skips or failures | Existing automated regression coverage |
| Isolated subscription probe using real in-memory SQLite | Confirmed positive scheduled expense | Reused the current migration/schema and test adapter; native modules were mocked |
| Isolated restore/upload probe | Confirmed restored baseline becomes `synced` with dirty flag cleared | Exercised current services with controlled async/network dependencies |
| Isolated snapshot failure probe | Confirmed replacement flag remains true after native deserialization rejects | Failure injection against the current replacement function |
| Actual CSV exporter/import preview probes | Confirmed refund sign change and unescaped formula text | Exercised current TypeScript implementation |
| Desktop preview/backlog measurements | Confirmed long synchronous calls | Diagnostic measurements, **not Android/Hermes FPS measurements** |
| `npx expo install --check` | FAIL: 11 packages behind SDK compatibility recommendations | Dependency alignment work remains; does not itself prove a runtime crash |
| `adb devices` | No connected devices | Native/device QA could not be performed |
| Release APK/AAB build, install, upgrade, and profiling | Not performed | Release-build viability and sustained 60–120fps remain unverified |

The tracker has 52 checked items, but many explicitly say manual/native verification is pending. Checked implementation items must not be treated as completed production acceptance tests. This was a targeted source and execution audit, not an exhaustive security review or a guarantee that all hidden bugs have been found. No real customer database or cloud account was modified.

## Findings at a glance

Severity describes impact. Evidence distinguishes an executed reproduction from a source-traced defect or risk.

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| V2-01 | High — release blocker | Subscription auto-post increases balances | Real SQLite reproduction |
| V2-02 | High — release blocker | Concurrent devices can overwrite each other's Quick Sync snapshots | Source-confirmed write race; live Drive test pending |
| V2-03 | High — release blocker | Manual restore races an existing upload | Controlled service reproduction |
| V2-04 | High — release blocker | Backup does not contain attachment files; Note attachments have no connected sync path | Archive/storage/sync call-path review |
| V2-05 | High — release blocker | CSV re-import converts refunds and reversals into ordinary transactions | Actual exporter/preview reproduction |
| V2-06 | High | Failed restore can suppress sync for the rest of the process | Failure-injection reproduction |
| V2-07 | High for growing datasets | Cloud backup and Quick Sync stop above the hard 5 MiB archive limit | Explicit rejecting branches |
| V2-08 | High performance risk | Import recalculates expensive previews during render and scans the ledger | Actual 1,000-row preview measurement plus call-path review |
| V2-09 | High performance risk | Schedule catch-up performs hundreds of synchronous transactions | Real SQLite statement-count/timing reproduction |
| V2-10 | Medium | Transactions CSV still exports formula-like text without protection | Actual exporter reproduction |

## V2-01 — Subscription auto-post records money in the wrong direction

**Implementation update (November 21, 2026):** Subscription schedule creation now uses negative expense amounts. Named migration `0049_fix_subscription_schedule_payment_sign` repairs existing subscription-linked templates and due/failed occurrence snapshots. It preserves original templates and flags positive historical scheduled payments in `settings.__subscription_payment_sign_repair_v1` for review. Already-posted ledger rows and intentional general refunds remain unchanged. Regression tests cover Auto Post, Post Now, Mark Paid, renewal/payment history, migration scope, and repeat execution. Historical correction remains a review task; this update does not grant production approval for the other findings.

**Evidence:** [subscription schedule construction](src/modules/subscriptions/services/save-subscription.service.ts#L121), [schedule posting](src/modules/scheduled-transactions/services/process-due-schedules.service.ts#L320), [explicit sign preservation](src/modules/transactions/services/transaction-exchange-snapshot.service.ts#L32).

`syncSubscriptionScheduleInContext()` sets an expense schedule's amount to `Math.abs(sub.amountMinorUnits)`. Scheduled transactions now support signed expenses/refunds. Posting forwards that positive amount, and the transaction service correctly preserves its explicit sign. Consequently, the subscription adapter creates a refund-like expense instead of a payment.

**Encounter scenario:**

1. Start with PHP 1,000 in a checking account.
2. Create a PHP 149 monthly subscription, select an expense category/account, enable automatic posting, and make the first payment due now.
3. Save or let the due-schedule processor run.
4. The ledger contains `type: "expense", amount_minor_units: 14900`. The balance increases to PHP 1,149; the correct balance is PHP 851.

The isolated real SQLite probe posted one occurrence and confirmed `+14900`. Manual **Mark Paid** uses a negative amount, so testing only that workflow misses this defect. Posting the linked occurrence manually also uses the defective schedule snapshot.

**Proper fix:** Construct subscription expense schedules with `-Math.abs(...)`. Preserve support for intentional refunds in the general transaction/schedule services. Repair affected subscription-linked templates and outstanding occurrence snapshots through a guarded maintenance operation. Identify already posted incorrect payments using subscription/schedule/posting relationships; do not globally negate every positive expense, because legitimate refunds exist. Back up first and make corrections idempotent and reviewable.

**Acceptance:** Compare automatic posting, Post Now, and Mark Paid against the same expected negative ledger delta, payment history, and renewal date. Verify existing linked schedules, legitimate positive expense refunds, and repeated repair execution.

**Performance:** New schedule construction is O(1), with no additional mount/focus reads. Historical repair must be gated and batched outside navigation, not added to ordinary reads.

## V2-02 — Two devices can pass the cloud check and overwrite each other

**Implementation update (November 21, 2026):** Quick Sync now publishes separate immutable snapshots rather than patching a shared file. Each publication records its observed parent revisions. Discovery paginates across the account (including duplicate-folder races), finds branch tips, and surfaces competing tips as conflicts. Overwrite resolution acknowledges the observed tips with a new snapshot; previous payloads remain recoverable in Drive and the manual backup catalog. V2 files omit the legacy Quick Sync marker/name so old clients cannot discover and overwrite them. Changes to a legacy mutable file create a separate branch. An exact restore selects the requested snapshot and publishes a resolution when needed; failed publication preserves an invalidated local baseline/error instead of claiming sync success.

**Verification and operational limits:** Controlled transport/service tests cover concurrent publications, retained bytes, parent-based resolution, retries, multi-page discovery, legacy updates, exact snapshot selection, and dirty-state preservation. Live two-device Drive verification remains pending. History is retained without automatic pruning: storage and metadata reads grow with revision count. Discovery fails closed above 10,000 records or 16 competing tips; review/export retained backups before manual cleanup. Graph processing is O(R), yields every 250 records, and sorts at most 16 tips. It adds no SQLite mount/focus queries or root subscriptions. Drive listing may lag a publication: the current upload is retained explicitly, and a late competing branch is detected on a subsequent check. This is recoverable branch detection, not a claim of atomic single-writer publication or automatic merging of financial data.

**Evidence:** [pre-upload check](src/modules/google-drive-backup/services/quick-sync.service.ts#L444), [snapshot creation](src/modules/google-drive-backup/services/quick-sync.service.ts#L502), [upload](src/modules/google-drive-backup/services/quick-sync.service.ts#L512), [unconditional file update](src/infrastructure/sync/adapters/google-drive-backup.adapter.ts#L251).

The remote revision is checked before snapshot creation/upload. The adapter's later binary `PATCH` carries no expected revision/precondition. `activeSyncPromise` serializes work within one app process; it cannot serialize two phones. The fixes for detecting an already changed remote do not close this interval.

**Encounter scenario:**

1. Devices A and B both know cloud revision R1.
2. A records lunch; B records fuel, before either sees the other's change.
3. Both devices read R1 and pass their pre-upload checks.
4. A uploads snapshot R2. B's slower upload then replaces it with B's independent snapshot R3.
5. A's lunch is absent from the latest cloud snapshot. The preflight checks showed no conflict.

This is a source-confirmed race; it was not reproduced against a live Google account during this audit. The first-file creation/discovery path also needs the same concurrent-writer test, because discovering an existing file immediately before an unconditional update is not conflict protection.

**Proper fix:** Enforce conflict protection at publication, using a server-enforced conditional update if the exact Drive binary upload endpoint supports the required contract. Verify that contract with an integration test; adding an `If-Match` header without demonstrating enforcement is insufficient. If atomic conditional replacement cannot be established, retain immutable per-revision snapshots and detect divergent parent revisions so both versions remain recoverable. A second GET alone still leaves a race. Handle a rejected stale write by keeping local data dirty and presenting a conflict.

**Acceptance:** Coordinate two clients so both pass the read gate before either publishes. Confirm no snapshot is silently lost, including first sync, retries, and app restart. Verify recovery rather than relying on Drive's eventual revision retention.

**Performance:** Cloud coordination remains asynchronous. Local transaction saves must continue to succeed offline without waiting for conflict checks or uploads.

## V2-03 — Manual restore is not coordinated with an upload already running

**Implementation update (November 21, 2026):** A shared Quick Sync operation coordinator now gates local restore, manual Drive restore, Quick Sync restore, and app reset. It invalidates old operation generations, blocks new uploads/checks, drains registered uploads and remote checks, and serializes replacement requests. Reset acquires the database snapshot lock only after draining sync, preventing a lock-order deadlock. Upload/check continuations revalidate their generation after asynchronous stages and cannot overwrite restored baselines, conflicts, dirty flags, or status. Connection reset, disable, sign-in/account selection, and sign-out invalidate old work; execution reads current settings rather than accepting a stale caller configuration. Restore cancellation before replacement leaves the database untouched; cancellation during replacement disables restored connection settings and remounts the changed database. Failure paths release coordination and clear obsolete syncing status.

**Verification and performance:** Tests exercise active upload success/failure, pending remote checks, queued follow-ups, disable/disconnect, stale configuration, actual local/Drive/reset entry points, overlapping requests, safety-backup failure, and cancellation before/during database replacement. Coordinator bookkeeping and generation guards are O(1); draining is asynchronous over active work and introduces no screen mount/focus queries or root subscriptions. Final status cleanup reads the existing state snapshot once per final replacement. An already-sent immutable upload may finish before replacement begins, but its stale local metadata is discarded. Device/slow-network validation remains pending; this does not certify 60–120fps or resolve the separate V2-06 snapshot cleanup finding. Release notes and version fields were left unchanged as requested.

**Evidence:** [local restore](src/modules/local-backup/services/restore-local-backup.service.ts#L26), [manual Drive restore](src/modules/google-drive-backup/services/restore-google-drive-backup.service.ts#L38), [coordinator used by Quick Sync restore](src/modules/google-drive-backup/services/quick-sync.service.ts#L198), [upload completion metadata](src/modules/google-drive-backup/services/quick-sync.service.ts#L525).

Quick Sync restores wait for the active upload. Local and manual Drive restores only cancel the debounce and set a replacement flag. Those actions do not cancel or await an upload already past its initial guards. After the restore invalidates the baseline, that older upload can finish and write its baseline back, clear the dirty flag, and show `synced` for a different local database.

**Encounter scenario:**

1. Quick Sync is uploading a 20-transaction snapshot on a slow connection.
2. Restore a local backup containing five transactions before that upload finishes.
3. The restore clears the remote baseline and marks local changes pending, as intended by P1-19.
4. The old upload finishes afterward and sets `hasUnsyncedLocalChanges: false`, installs its revision, and shows Synced.
5. The five-transaction workspace now has misleading sync metadata; a later edit can upload it over the cloud snapshot without the intended restore conflict.

**Executed evidence:** The controlled probe observed baseline `null`/dirty `true` immediately after restore, followed by the pre-restore upload's revision/dirty `false` and status `synced`.

**Proper fix:** Use one operation coordinator for every replacement entry point, including local restore, manual cloud restore, Quick Sync restore, and reset. Stop new work before waiting for existing work. Add a database/connection generation captured by async operations; stale completions must not publish current metadata. Re-read relevant config after waits. Preserve the restored workspace's invalidated baseline until the user resolves the conflict.

**Acceptance:** Hold an upload promise open, restore/reset, then release it. Check both database contents and metadata. Repeat with upload failure, sign-out, disabled sync, and a remote check already in flight.

**Performance:** Promise coordination and an O(1) generation check add no ledger scans and do not block normal local saves on network activity.

## V2-04 — A successful database backup is not a complete attachment backup

**Evidence:** [archive creation](src/modules/local-backup/services/create-backup-archive.service.ts#L15), [Note file storage](src/modules/notes/services/note-attachment-storage.service.ts#L24), [new Note attachment metadata](src/modules/notes/repositories/note-attachments.repository.ts#L94), [Note upload adapter](src/infrastructure/sync/adapters/google-drive-backup.adapter.ts#L500), [transaction attachment sync](src/modules/transactions/services/transaction-attachments.service.ts).

The archive packages serialized SQLite bytes, not files from attachment directories. Restoring those bytes restores attachment records and file names, but cannot recreate missing file contents. Transaction attachments have a separate cloud path when their upload has succeeded. Note attachments are inserted as `pending` with `driveFileId: null`; the Note upload adapter has no connected caller/processor in the reviewed source.

**Encounter scenario:**

1. Attach a receipt photo to a Note and create a successful local or Drive backup.
2. Restore that backup on a fresh device, or reinstall and restore.
3. The Note and attachment record return, but the receipt file is absent.
4. A local-only transaction attachment can fail similarly if its independent cloud upload never completed. On the same device, deleting a Note removes its file, so an older database-only backup cannot recover that file either.

**Proper fix:** Make portable backups include an attachment manifest and file payloads, with checksums and versioned compatibility. Keep payloads inside the protected archive when a password is used. Stage and validate restored files before publishing the database, with a recovery strategy for interrupted file/database replacement. Connect Note uploads/downloads to the existing offline outbox pattern if cross-device attachment sync is promised. Explicitly show missing/pending attachment coverage; do not present a database-only backup as complete receipt recovery.

**Acceptance:** On a clean app directory, restore Notes and transactions with image attachments while offline and compare file hashes. Test a pending cloud upload, deleted original files, interrupted restore, and password-protected archives. A same-device restore with existing attachment files is insufficient.

**Performance:** Stream/chunk file processing and hashing, publish progress, and avoid whole-photo work during render. Note hashing currently loops synchronously over file chunks; an `async` function declaration alone does not yield that loop.

## V2-05 — Import changes refund/reversal signs, including the app's own CSV

**Evidence:** [signed CSV export](src/modules/transactions/utils/transactions-csv.ts#L63), [import normalization](src/modules/data-import/utils/import-preview.ts#L171), [preview totals](src/modules/data-import/utils/import-preview.ts#L303).

The exporter preserves signed income/expense amounts. The importer unconditionally turns every expense into `-Math.abs(amount)` and every income into `Math.abs(amount)`. Thus expense refunds and negative income adjustments lose their meaning. The preview's expense aggregation also assumes every expense is ordinary spending.

**Encounter scenario:**

1. Record an expense refund of PHP 100, represented as a positive expense.
2. Export it, then import into a clean matching workspace/account.
3. The preview says Ready but plans `-10000` instead of `+10000`.
4. From PHP 1,000, import produces PHP 900 rather than PHP 1,100: a PHP 200 discrepancy versus the correct result.

The actual exporter/preview probe confirmed this behavior. Negative income adjustments are subject to the opposite sign conversion.

**Proper fix:** Distinguish signed-ledger input from unsigned, type-based input. Recognize the app's own export format and preserve its signs; provide an explicit amount interpretation for external files whose positive expense values mean unsigned spending. Keep debit/credit handling consistent with the chosen interpretation. Calculate preview balances, net income/expense totals, fingerprints, and committed values from the same signed representation.

**Acceptance:** Round-trip ordinary expenses, refunds, income reversals, debit/credit files, and intentional duplicate overrides. Compare exact signs, balances, and totals; include currencies with zero, two, and three decimal places.

**Performance:** Sign interpretation is O(1) per row and requires no extra SQL. It can be incorporated into the single-pass preview work recommended below.

## V2-06 — A restore failure can leave the database permanently marked as replacing

**Evidence:** [replacement flag and deserialization](src/infrastructure/database/snapshot.ts#L101), [later cleanup](src/infrastructure/database/snapshot.ts#L153), [sync listener guard](src/modules/google-drive-backup/components/quick-sync-processor.tsx#L27).

`setDatabaseReplacing(true)` runs before normalization/deserialization, but the matching `finally` is entered only later. If normalization or native deserialization throws, the inner replacement depth never decrements. The caller's own `finally` releases its outer increment but leaves this leaked increment behind.

**Encounter scenario:**

1. Restore an otherwise checksum-valid archive whose SQLite image cannot be deserialized, or inject a native deserialization/allocation failure.
2. Dismiss the restore error and continue using the app.
3. `isDatabaseReplacing()` remains true. Quick Sync's change listener and new sync/check requests skip work for the remainder of the process.

The failure probe returned `isDatabaseReplacingAfterFailure: true`. This is a failure-path defect; it is not a claim that every damaged archive bypasses checksum validation.

**Proper fix:** Establish the cleanup scope immediately after acquiring the replacement state. Keep replacement/rollback handles nullable, close only initialized handles, and release the state exactly once regardless of normalization, allocation, validation, migration, or cleanup failure. Ensure secondary close errors do not hide the primary restore error.

**Related recovery concern:** Rollback-byte capture is currently best-effort. If it fails, replacement still proceeds; a subsequent migration/validation failure then has no captured original to restore. Require a verified recovery copy before destructive replacement, or fail before touching the live database. This second failure combination was source-reviewed, not executed against a device database.

**Acceptance:** Inject errors at every stage, including before deserialization completes. Assert replacement depth returns to its previous value, the original ledger remains recoverable, and a later mutation can sync normally.

**Performance:** Cleanup/generation bookkeeping is O(1). Recovery snapshot I/O belongs in the explicit restore workflow behind progress UI, never in mount/focus queries.

## V2-07 — Cloud backup has a hard growth limit

**Evidence:** [archive size limit](src/infrastructure/sync/adapters/google-drive-backup.adapter.ts#L7), [new-file rejection](src/infrastructure/sync/adapters/google-drive-backup.adapter.ts#L207), [update rejection](src/infrastructure/sync/adapters/google-drive-backup.adapter.ts#L259).

Both cloud backup creation and Quick Sync updates throw when the archive exceeds `5 * 1024 * 1024` bytes. This is an application limit, not the maximum file size supported by Google Drive. The error still refers to resumable uploads being unavailable in “Phase 1.”

**Encounter scenario:** A long-lived user's SQLite archive grows past 5 MiB through ledger history, Notes, schedules, import history, and other metadata. Every subsequent cloud backup/sync attempt fails, leaving the last successful cloud copy stale. Photo files are outside the current database archive and are not the direct cause of this threshold.

**Proper fix:** Implement resumable uploads for both creation and replacement, with retry/resume handling and the conflict safeguards from V2-02. Use bounded buffers; avoid duplicating the whole archive repeatedly. Report the last successful backup date and actionable failures. Google recommends resumable upload for larger files and unreliable mobile connections: [Drive upload documentation](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

**Acceptance:** Exercise archives immediately below/above the current threshold and larger fixtures, with interrupted upload, authentication refresh, retry, and byte-for-byte restore verification. Do not infer archive size from transaction count alone.

**Performance:** Resumable network I/O should not block local mutations. Profile snapshot creation, buffer copying, memory peak, and garbage collection while the user scrolls.

## V2-08 — Supported imports can block typing and freeze the interface

**Evidence:** [preview during render](src/modules/data-import/hooks/use-data-import.ts#L78), [paired-transfer candidate scan](src/modules/data-import/utils/import-preview.ts#L177), [second pairing scan](src/modules/data-import/utils/import-preview.ts#L226), [commit revalidation](src/modules/data-import/services/commit-import.service.ts#L47), [full comparison ledger](src/modules/transactions/repositories/import-transactions.repository.ts#L6), [all imported source keys](src/modules/data-import/repositories/imports.repository.ts#L8).

`useMemo` recomputes the entire preview when options change, including mapping/source-field edits. Each paired transfer can scan the entire file to infer its destination, and pairing scans rows again: **O(R²)** work. Hashing/serializing the complete preview adds further work. Commit revalidates before backup and again inside the synchronous transaction. Catalog reads hydrate all active comparison transactions and historical source keys rather than checking only candidates from this file.

**Measured probes on desktop Node, not Hermes:**

- Ordinary 1,000-row previews took approximately **21–31 ms per rebuild** in the final run.
- A valid 1,000-row file containing 500 opposite transfer pairs without destination columns took **1,935.87 ms**; the preview accepted 500 logical transfers.

**Encounter scenario:** Import a supported 1,000-row bank export with paired transfer legs. Change a source label, mapping, or row decision. The full preview runs during render, so keystrokes/taps wait behind the calculation. Pressing Import repeats expensive validation and then performs many synchronous writes. A spinner cannot make this synchronous work responsive.

**Proper fix:** Index candidate transfers by account/date/time/amount and reverse direction using Maps, preserving the existing ambiguity rules. Parse row facts once and reuse them; index accounts/categories instead of repeated searches. Compute previews outside render with cancellation/request IDs, immediate pending UI, and chunking or a verified background execution path. Query only the incoming source keys and duplicate candidates in batches of at most 500. Preserve atomic import semantics: do not introduce partial commits merely to add yields. If necessary, stage/validate first and use a suitable async transaction strategy or reduce the supported cap until measured budgets pass.

**Acceptance:** Test 100/500/1,000 rows, missing destinations, ambiguous pairs, identical timestamps, one-row edits, and a 10k+ existing ledger. Assert matching parity and candidate-bounded SQL. Profile typing and taps in a release build; reject stale preview results after edits.

**Performance target:** Keep individual JS work slices below 8.3–16.6 ms. Deferring a two-second callback until after paint does not satisfy that target.

## V2-09 — Returning after a long absence can trigger a schedule catch-up stall

**Evidence:** [500-item synchronous processing loop](src/modules/scheduled-transactions/services/process-due-schedules.service.ts#L49), [startup/resume processor](src/modules/scheduled-transactions/components/scheduled-transactions-processor.tsx), [unbounded occurrence read](src/modules/scheduled-transactions/repositories/scheduled-transactions.repository.ts#L292), [per-write billing reconciliation](src/modules/transactions/services/create-transaction.service.ts#L104), [billing account scans](src/modules/credit-cards/services/reconcile-credit-card-billing.service.ts#L388).

`processDueSchedules()` processes up to 500 occurrences in one synchronous call, starting a database transaction for each. Posting an ordinary transaction normally reconciles credit-card billing too. The management hook can run this workflow on focus and then hydrate every occurrence. Waiting for interactions or a one-second resume delay only changes when the long call starts.

**Executed evidence:** With real in-memory SQLite and the existing ledger creation path, a 500-occurrence daily backlog executed **8,000 statements in 1,064.69 ms**. The reused test adapter deliberately disabled billing reconciliation; production can do additional work. This measures the synchronous call, not native device frame times.

**Encounter scenario:** A daily schedule is months behind because the app was unused, or an old workspace is restored. On launch/resume, the processor catches up while the user starts scrolling or navigating. JS event handlers stop responding until the batch ends. Opening the schedules screen can add another processing/read workload, and accumulated history makes its all-occurrences read grow over time.

**Proper fix:** Process small, time-bounded batches and yield/cancel between them; coalesce startup/focus/resume triggers. Keep each occurrence atomic and idempotent, and reconcile billing once per appropriate batch rather than for every posted item. Publish coalesced mutation events after successful commits. Page/filter occurrence history in SQL instead of loading all history on focus. Preserve reliable continuation until all due work is processed.

**Acceptance:** Use 500+ overdue occurrences plus a large card ledger. Assert no duplicates after interruption/restart, bounded statements per batch, stable balances/payment history, and responsive release-build interaction during catch-up.

**Performance:** Current cost scales with overdue occurrences, plus repeated billing/ledger work. The corrected design must bound per-frame work, not just total occurrences per run.

## V2-10 — Transaction exports still allow spreadsheet formula interpretation

**Evidence:** [CSV escaping](src/modules/transactions/utils/transactions-csv.ts#L30), [transaction text fields](src/modules/transactions/utils/transactions-csv.ts#L139), [export builder](src/modules/transactions/utils/transactions-csv.ts#L158).

Accounts export was hardened in P2-11d, but Transactions export only handles CSV delimiters/quotes. It does not neutralize formula-like text in names, Notes, categories, labels, or account names. The exporter probe emitted a transaction name `=1+1` directly into a CSV cell.

**Encounter scenario:** Import or enter a transaction with formula-like text, export transactions, and open the CSV in a spreadsheet. The spreadsheet may evaluate the cell rather than display the original text. Impact depends on the formula and spreadsheet settings; arbitrary code execution is not established by this audit. See [OWASP's CSV injection guidance](https://owasp.org/www-community/attacks/CSV_Injection).

**Proper fix:** Apply the established account-export text protection to every transaction text column, including dangerous prefixes after leading whitespace/control characters and literal leading apostrophes. Preserve real numeric negative amounts. If the app reverses this protection during re-import, do so only for a recognized app export format.

**Acceptance:** Cover `=`, `+`, `-`, `@`, leading whitespace/control characters, quotes, newlines, and apostrophes. Verify exported values in Excel/LibreOffice and check safe re-import preserves the original text.

**Performance:** Linear in exported text size; negligible relative to export hydration. It introduces no new queries.

## Additional release gates and follow-up risks

### SDK compatibility check is not clean

`npx expo install --check` reported these installed/recommended versions on the audit date:

| Package | Installed | Recommended |
|---|---|---|
| `@expo/ui` | `57.0.22` | `~57.0.26` |
| `expo` | `57.0.27` | `~57.0.33` |
| `expo-constants` | `57.0.22` | `~57.0.24` |
| `expo-crypto` | `57.0.3` | `~57.0.4` |
| `expo-image-picker` | `57.0.20` | `~57.0.21` |
| `expo-linking` | `57.0.12` | `~57.0.14` |
| `expo-notifications` | `57.0.23` | `~57.0.25` |
| `expo-router` | `57.0.25` | `~57.0.31` |
| `expo-sharing` | `57.0.22` | `~57.0.26` |
| `expo-splash-screen` | `57.0.9` | `~57.0.11` |
| `expo-sqlite` | `57.0.3` | `~57.0.5` |

This is a compatibility warning, not evidence of eleven separate bugs. Align SDK 57 patches deliberately, review native dependency changes, rebuild, and rerun the relevant checks. No packages were installed or updated in this audit. The exact [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [SDK 57 SQLite reference](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) were consulted.

### Several dynamic ID lookups still exceed the project's 500-ID policy

Examples include [installments by plan IDs](src/modules/credit-cards/repositories/credit-card-billing.repository.ts#L189), [budgets by category IDs](src/modules/budgets/repositories/category-budgets.repository.ts#L138), and the older [transfer sibling query](src/modules/transactions/repositories/transactions.repository.ts#L464). Actual failure depends on the build's bind limit and whether a caller supplies enough IDs. These are scale risks, not reproduced native failures. Audit reachable callers and chunk at 500 while retaining deterministic global ordering when merging results.

### Release signing and deployment metadata need an explicit check

- [Android release signing](android/app/build.gradle#L124) falls back to the debug configuration if upload signing properties are absent. This does not prove the intended build is debug-signed. Validate the actual APK/AAB certificate against the Play app's expected upload certificate and make release builds fail clearly when signing configuration is missing.
- Version fields match at `1.8.0` / `22`. The English v1.8.0 release date remains November 18, 2026; set all localized dates to the actual deployment date when the release is approved.
- Native Google sign-in, billing purchase/restore, App Lock/modal ordering, notifications, widgets, sharing, and ads require release-device checks. The current JavaScript tests mock native dependencies.
- Android is the directly inspected native target. iOS production readiness was not established; its configuration, signing, and native flows require separate acceptance if iOS is in scope.

## Explicit 60–120fps assessment

The app is not yet demonstrated to sustain 60–120fps. The import and schedule probes show work far beyond the JS budget even on desktop. They do not establish the frame rate of every screen.

| Area | JS/navigation risk | Mount/focus/query behavior | Render/context impact |
|---|---|---|---|
| Import preview | Measured long synchronous computation | No SQL inside preview itself; file selection/commit hydrate comparison ledger and source keys | Full preview recalculates on options changes during render |
| Schedule processor | Measured long synchronous database batch | Up to 500 occurrence transactions per call; management focus also reads all occurrences | Global mutation events refresh subscribed screens after posting |
| Quick Sync/restore | Network is async; snapshot copies/validation still need measurement | Snapshot/restore is whole-database work | Database replacement intentionally remounts provider children |
| Attachments/backup list | File hashing and whole-archive reads can scale poorly | Backup listing reads archive bytes for metadata; attachment files require separate work | Keep heavy work out of render and closed modals |
| Other remediated screens | Existing deferred/cancelled reads are improvements | Existing tests cover several bounded query paths; no complete app-wide query budget was measured here | No device Profiler run was available to rule out remaining cascades |

`scheduleAfterPaint` uses double `requestAnimationFrame`; its callback still runs synchronously on JavaScript. A native-driven skeleton can keep its animation moving, but does not make JS-driven taps, typing, or navigation responsive during a long callback. Expo's [SQLite API reference](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) explicitly identifies heavy synchronous operations as JS-thread blocking risks.

Fixes should avoid adding root navigation subscriptions or broad changing context values. Keep state/dispatch split, provider values stable, modal data hooks gated, and mutation refresh ownership explicit. Those rules remain necessary, but they cannot compensate for a two-second calculation on the same thread.

## Remediation and release acceptance order

1. **Financial correctness:** Fix V2-01 and V2-05; design a safe repair for affected existing subscription postings/templates.
2. **Recovery and cloud safety:** Fix V2-02, V2-03, and V2-06 together with coordinated failure/race tests. Resolve V2-04 before promising full attachment recovery.
3. **Responsiveness and growth:** Fix V2-08/V2-09 and remove or explicitly resolve V2-07's cloud growth limit. Add V2-10 export protection.
4. **Build alignment:** Resolve SDK compatibility warnings, verify signing, and build the intended production APK/AAB.
5. **Native acceptance:** Complete the tracker scenarios against the final release artifact, including a real v1.7.0 in-place upgrade, fresh install, same-device and clean-device restore, two-device sync, and slow/interrupted networks.
6. **Performance acceptance:** Profile an Android release build on a modest device and a 120Hz device with 1k/10k+ ledger fixtures, the supported 1,000-row paired import, a schedule backlog, and archives over 5 MiB. Record JS/UI frame times, input latency, memory peaks, SQL counts, and query plans. Verify hot queries use their intended indexes without unexpected temporary sorts.
7. **Final sign-off:** Rerun TypeScript, the full suite, new behavioral regressions, compatibility checks, and release metadata checks on the exact candidate commit. Use a staged rollout only after these gates pass.

Future tests must exercise the cross-feature paths that escaped the current suite: subscription → schedule → ledger, exporter → importer → ledger, and restore → in-flight upload completion. Keep native integration tests separate from mocked service tests, and do not use passing mocks or desktop timings as a device performance certificate.

**Current decision:** The code is suitable for continued remediation and controlled QA with disposable data. Production approval should wait for the financial/data-safety fixes and measured release-device acceptance described above.
