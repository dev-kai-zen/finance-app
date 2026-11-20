# v1.7.0 → v1.8.0 Pre-Release Audit, Bug Scenarios & QA Test Plan

- **Baseline:** `9341c5c` (`v1.7.0`, `versionCode 21`) → **HEAD:** `2a91229` (`v1.8.0`, `versionCode 22`, branch `feature/export-data`)
- **Scope:** 17 commits, 187 files changed (`+17,158 / -1,829`)
- **Automated Checks:**
  - `npx tsc --noEmit`: **Pass (0 errors)**
  - `npm test`: **Pass (497 / 497 tests)**
  - Localization parity (`en`, `es`, `fil`): **Pass (2,254 keys, 0 missing keys, 0 placeholder mismatches, 0 missing static `t()` references)**
  - Release metadata alignment: `package.json` (`1.8.0`), `app.json` (`1.8.0`, `versionCode: 22`), and `android/app/build.gradle` (`1.8.0`, `versionCode: 22`) match. *(Note: `versionHistory.v180.date` is currently `"November 18, 2026"`, same as `v170.date` — update to actual release date before shipping.)*

> [!CAUTION]
> **Release Recommendation: Hold production release.** This audit confirmed **9 Critical** and **13 High** bugs — including **3 silent Quick Sync cloud data-loss scenarios**, a **lock-screen bypass**, **broken Chat with Kai transfer edit/delete**, **broken Sample → Import onboarding**, **broken Calendar schedule updates & skeleton deadlock**, **broken Global Search for Notes/Transfers/Splits**, and **v1.7.0 → v1.8.0 currency upgrade sort scrambling + boot stall**.

---

## Part 1 — Bugs Introduced in v1.7.0 → v1.8.0 (Regressions)

### Critical (Release Blockers)

#### 1. Quick Sync: App Reset Preserves `deviceId`, Silently Overwriting Cloud Backup with an Empty Database
- **Files:** [quick-sync-conflict.ts](src/infrastructure/sync/quick-sync-conflict.ts#L49-L54), [quick-sync-device.storage.ts](src/infrastructure/sync/quick-sync-device.storage.ts#L207-L216), [reset-google-drive-for-app-reset.service.ts](src/modules/google-drive-backup/services/reset-google-drive-for-app-reset.service.ts#L12-L28), [quick-sync.service.ts](src/modules/google-drive-backup/services/quick-sync.service.ts#L370-L415)
- **Root Cause:** `resetAppData()` clears `lastKnownRemote*` tracking but does **not** rotate `deviceId` (or clear `customDeviceName`) in `quick-sync-device.json`. After reset + onboarding, re-enabling Quick Sync sees `remoteFile.lastUpdatedByDeviceId === local.deviceId`, returns `adopt_self` instead of `remote_ahead`, sees `hasUnsyncedLocalChanges === true`, and uploads the empty database directly over the user's cloud backup with no conflict prompt.
- **Manual Verification:**
  1. On Device A with real data & Quick Sync ON, tap **Sync Now**.
  2. Go to **Settings → Reset App Data** and finish onboarding with a fresh empty workspace.
  3. Open **Google Drive Backup**, reconnect the same Google account, dismiss any restore prompt, and toggle **Quick Sync ON**.
  4. **Actual:** No conflict modal appears; the cloud Quick Sync backup is silently overwritten with the empty workspace.

#### 2. Quick Sync: Edits Made During an In-Flight Upload Are Dropped and `hasUnsyncedLocalChanges` Is Cleared
- **Files:** [quick-sync.service.ts](src/modules/google-drive-backup/services/quick-sync.service.ts#L165-L167), [quick-sync.service.ts](src/modules/google-drive-backup/services/quick-sync.service.ts#L395-L432)
- **Root Cause:** While `performSync` is uploading the snapshot created at line 395, any new mutation triggers the 3s debounce. If the debounce fires while `activeSyncPromise` is still running, `triggerQuickSync` returns the in-flight promise without scheduling a follow-up upload. When the first upload completes, line 431 unconditionally sets `hasUnsyncedLocalChanges: false` and status `"synced"`. The new edit is never uploaded, and a later conflict modal falsely says *"No unsynced local changes detected"*.
- **Manual Verification:**
  1. Throttle network (~6s upload latency) with Quick Sync ON.
  2. Add Transaction A → wait 3s until status is **Syncing**.
  3. While **Syncing**, add Transaction B and wait for the first sync to finish (>3s).
  4. **Actual:** Status becomes **Synced** without a second upload; background/resume does not upload Transaction B; restoring on Device B is missing Transaction B.

#### 3. Quick Sync: Mixed v1.8.0 + v1.7.0 Devices Miss Conflicts (Google Drive `PATCH` Merges `appProperties`)
- **Files:** [quick-sync-conflict.ts](src/infrastructure/sync/quick-sync-conflict.ts#L49-L54), [quick-sync-conflict.ts](src/infrastructure/sync/quick-sync-conflict.ts#L95-L102), [google-drive-backup.adapter.ts](src/infrastructure/sync/adapters/google-drive-backup.adapter.ts#L264-L272)
- **Root Cause:** Drive v3 `PATCH` preserves omitted `appProperties` keys. When Device A (v1.8.0) uploads `syncRevisionId: "rev-1"` and `lastUpdatedByDeviceId: "dev-A"`, and then Device B (still on v1.7.0) uploads without those keys, Drive keeps `"rev-1"` and `"dev-A"` while advancing `headRevisionId`. On Device A, `detectRemoteAhead` short-circuits on `syncRevisionId !== lastKnownRemoteSyncId` (`false`) and never checks `headRevisionId` (and even if it did, stale `lastUpdatedByDeviceId` would trigger `adopt_self`).
- **Manual Verification:**
  1. Sync Quick Sync from Device A (v1.8.0).
  2. Add a transaction and sync Quick Sync from Device B (v1.7.0) on the same Google account.
  3. Resume Device A and add a transaction.
  4. **Actual:** Device A shows no conflict modal and overwrites Device B's changes.

#### 4. Quick Sync: `QuickSyncConflictModal` Renders Over `AppLockGate` Lock Screen (Security Bypass on Android / Dropped Modal on iOS)
- **Files:** [app-lock-gate.tsx](src/modules/security/components/app-lock-gate.tsx#L23-L44), [_layout.tsx](src/app/_layout.tsx#L59-L72), [quick-sync-processor.tsx](src/modules/google-drive-backup/components/quick-sync-processor.tsx#L77-L118)
- **Root Cause:** `AppLockGate` keeps `{children}` mounted under its `<Modal visible={isLocked}>`. 1.5s after launch/resume while locked, `QuickSyncProcessor` opens `<QuickSyncConflictModal>` as a second `<Modal>`. On Android it stacks **above** the password screen (exposing device metadata and allowing **Restore** or **Overwrite** without unlocking); on iOS UIKit drops the modal silently.
- **Manual Verification:**
  1. Enable App Lock password on Device A (restart app so App Lock is active) with Quick Sync ON.
  2. Upload newer Quick Sync data from Device B.
  3. Open/resume Device A to the Lock Screen and wait 2 seconds without unlocking.
  4. **Actual (Android):** Conflict modal pops over the lock screen and accepts taps.

#### 5. Calendar: Posted / Skipped Schedules Never Update Until Switching Months
- **Files:** [use-calendar-data.ts](src/modules/calendar/hooks/use-calendar-data.ts#L227-L239)
- **Root Cause:** `monthScheduleOccurrences` `useMemo` removed `transactions` from its dependency array, leaving only `[loading, monthDateRange]`. After initial load, `loading` stays `false` during `postOccurrence`, `skipOccurrence`, and `refreshAll`, so `monthScheduleOccurrences` never recomputes.
- **Manual Verification:**
  1. Open **Calendar → Schedules** tab on a month with a due/upcoming occurrence.
  2. Tap **Post Now** (or **Skip**) and confirm.
  3. **Actual:** Schedule card stays stuck as Due/Upcoming with active Post/Skip buttons (allowing duplicate taps) until navigating to another month and back.

#### 6. Onboarding + Data Import: Sample Mode → Guided Setup → Import Accounts Always Fails (and Would Wipe Imported Accounts if Unblocked)
- **Files:** [is-personal-workspace.service.ts](src/modules/onboarding/services/is-personal-workspace.service.ts#L10-L15), [commit-import.service.ts](src/modules/data-import/services/commit-import.service.ts#L35-L45), [data-import-screen.tsx](src/modules/data-import/screens/data-import-screen.tsx#L136-L140), [workspace.service.ts](src/modules/onboarding/services/workspace.service.ts#L130-L131)
- **Root Cause:**
  1. Exiting Sample Mode keeps `onboarding.status = "completed"` and `workspace.mode = "sample"`. `DataImportScreenContent` enables the UI via `allowOnboarding`, but `commitImport()` calls `canImportWorkspaceData()`, which returns `false` and throws `"workspace"`.
  2. Free users also hit `freeAccountLimit` immediately because `getImportCatalog()` counts the 7 active sample accounts (`7 > 5`).
  3. Even if unblocked, `commitImport()` calls `clearSampleWorkspaceIfNeeded(tx)` without switching `workspace.mode` off `"sample"`, so tapping **Finish Setup** later calls `clearSampleWorkspaceIfNeeded(tx)` again and **deletes all newly imported accounts**.
- **Manual Verification:**
  1. Enter **Sample workspace** → tap **"Start your personal workspace"** → **"Browse all setup options"** → **"Get Started"** → choose **"Import accounts"**.
  2. Pick a valid 1-account CSV.
  3. **Actual:** Free users are blocked by the 5-account limit; Pro users fail on Import with the personal-workspace-only error.

#### 7. Chat with Kai: Editing OR Deleting ANY Saved Transfer Always Fails
- **Files:** [use-transactions.ts](src/modules/transactions/hooks/use-transactions.ts#L218), [use-paginated-transactions.ts](src/modules/transactions/hooks/use-paginated-transactions.ts#L254), [chat-with-kai-modal.tsx](src/modules/chat-with-kai/components/chat-with-kai-modal.tsx#L202-L239), [transaction-form-modal.tsx](src/modules/transactions/components/transaction-form-modal.tsx#L1598), [delete-transaction.service.ts](src/modules/transactions/services/delete-transaction.service.ts#L18-L20)
- **Root Cause:** `recordTransfer()` returns `tgrp_...` (`transactionGroupId`), which Kai saves in `proposal.transactionId`.
  - **Edit:** `handleEdit` puts `proposal.transactionId` into `draftItem.id` and hardcodes `transactionGroupId: null` (line 217), so `updateTransfer` throws on empty `transactionGroupId`.
  - **Delete:** `handleDelete` passes `tgrp_...` into `removeTransaction(id)`, which queries `WHERE transactions.id = id`, finds nothing, fails silently, and closes the dialog leaving the transfer untouched.
  *(Pre-existing root cause, now heavily exposed by v1.8.0's persisted chat sessions and personalized transfer prompts.)*
- **Manual Verification:**
  1. Open **Chat with Kai**, send/tap a transfer prompt (e.g., `"Transfer 2000 from Cash to Bank"`), and tap **Save**.
  2. Tap **Edit**, change amount to `2500`, tap Save → fails.
  3. Tap **Delete** → confirm → dialog closes with no error and transfer remains saved.

---

### High Severity

#### 8. Global Search Never Returns Notes (`notes` Permanently `[]`)
- **Files:** [use-general-search.ts](src/modules/search/hooks/use-general-search.ts#L28), [use-notes.ts](src/modules/notes/hooks/use-notes.ts#L63-L69)
- **Root Cause:** v1.8.0 changed `useNotes()` to `useNotes({ autoRefresh: false, skipQuery: !isOpen })` and removed the effect that called `refreshNotes()`. Because `useNotes` guards on `if (!autoRefresh || skipQuery) return;`, Notes are never loaded.
- **Manual Verification:** Create a Note `"Tax Docs"`, open Global Search, type `"Tax Docs"` → **0 Note results appear**.

#### 9. Global Search Transactions: Duplicate Transfer Legs, Missing Split Categories & Unescaped SQL `LIKE` Wildcards
- **Files:** [search-transactions.service.ts](src/modules/transactions/services/search-transactions.service.ts#L25-L52), [use-general-search.ts](src/modules/search/hooks/use-general-search.ts#L195-L217)
- **Root Cause:** Queries raw `transactions` without `canonicalLogicalTransactionCondition()` (returning both transfer legs with opposite signs), never joins `transaction_entries` (split categories are unsearchable), and uses unescaped `LIKE '%...%'` without `ESCAPE '\'`. *(Also formats `amountMinorUnits` with typed `currencyCode` instead of account currency.)*
- **Manual Verification:**
  1. Search a transfer name → 2 duplicate rows (`-₱...` and `₱...`).
  2. Search a category used only inside a split expense → missing.
  3. Search `%` → returns up to 8 unrelated transactions.

#### 10. Deep-Linking / Quick-Opening a New Transfer Resets Form Mode to "Expense"
- **Files:** [transaction-form-modal.tsx](src/modules/transactions/components/transaction-form-modal.tsx#L552-L565), [transaction-form-modal.tsx](src/modules/transactions/components/transaction-form-modal.tsx#L1152-L1162)
- **Root Cause:** While deferred `useAccounts()` is loading (`accounts = []`), `activeAccountCount` is `0` (`allowTransfer = false`), so line 1158 forces `setMode("expense")`. Once accounts load 2 frames later, `formInitSessionRef` prevents re-initialization and never restores `mode = "transfer"` or `transferToAccountId`.
- **Manual Verification:** Force-close and reopen app (≥2 accounts), open Global Search → tap **Record Transfer** (or tap the Android **Transfer** widget) → form opens in **Expense** mode instead of **Transfer**.

#### 11. Calendar: Permanent Loading Skeleton Deadlock on Rapid Month Toggle (`A → B → A`) or DB Error
- **Files:** [use-calendar-data.ts](src/modules/calendar/hooks/use-calendar-data.ts#L79-L124)
- **Root Cause:** Switching Month A → B sets `isMonthLoading = true` and schedules `scheduleAfterPaint`. Tapping back to Month A before 2 frames elapse cancels the callback and hits `if (loadedMonthKeyRef.current === key) return;` **without** calling `setIsMonthLoading(false)`. The screen stays locked on `<PageLoadingState variant="grid" />`.
- **Manual Verification:** On **Calendar**, rapidly tap **Next Month** then **Previous Month** back-to-back → stuck permanently on grid skeleton until selecting a different month.

#### 12. Calendar Balance Sheet Tab: Flashes `₱0.00` / Previous Day's Data & Breaks Default Pocket Auto-Expansion
- **Files:** [use-calendar-data.ts](src/modules/calendar/hooks/use-calendar-data.ts#L370-L405), [calendar-balance-sheet-tab.tsx](src/modules/calendar/components/calendar-balance-sheet-tab.tsx#L53-L67)
- **Root Cause:** `selectTab("balance_sheet")` clears `isTabLoading` in an earlier `scheduleAfterPaint` than the `useEffect` that computes `balanceSheetData`. Ribbon/badge flash `0 accounts / ₱0.00`; `CalendarBalanceSheetTab` mounts while `accountTypes` is `[]`, so its `expandedPockets` `useState` initializer produces an empty `Set` and pockets stay collapsed.
- **Manual Verification:** With a pocket-enabled account, open **Calendar → Balance Sheet** → watch summary ribbon flash `₱0.00` and pockets render collapsed; tap another day and observe previous day's numbers flashing under the new date.

#### 13. Budgets: Toggling a Budget OFF Drops Displayed Spent to `₱0.00` and Inflates Rollover Target
- **Files:** [calculate-category-budget.service.ts](src/modules/budgets/services/calculate-category-budget.service.ts#L178-L179), [calculate-category-budget.service.ts](src/modules/budgets/services/calculate-category-budget.service.ts#L258-L295)
- **Root Cause:** `calculateBudgetStatusesBatch` skips disabled budgets when gathering query IDs (`if (!budget.isEnabled) continue;`), then passes `precomputedSpent = 0` and `precomputedPreviousSpent = 0` when building their cards—zeroing spend and adding 100% prior target as rollover.
- **Manual Verification:** On **Budgets**, toggle an active budget with spending (and rollover) **OFF** → Spent immediately drops to `₱0.00` and rollover doubles the budget target.

#### 14. Dashboard: Flashes `"No prior month"` and Collapses Net Worth Chart / Year Pills on Every Focus or Mutation
- **Files:** [use-dashboard.ts](src/modules/dashboard/hooks/use-dashboard.ts#L48-L84)
- **Root Cause:** `refresh()` unconditionally overwrites `summary` with `includeNetWorthHistory: false` (`EMPTY_NET_WORTH_HISTORY`, `netWorthChangePercentage: null`), wiping previously loaded chart/trend state for 2+ frames until the deferred history merge finishes.
- **Manual Verification:** Open **Dashboard** with multi-month history (select `ALL` on Net Worth chart), add a transaction or visit Accounts and press Back → trend badge flashes `"No prior month"` and chart/year pills collapse and jump back.

#### 15. Accounts: Accounts with Transaction Presets (and 0 Transactions/Schedules) Hit a Dead-End (Cannot Delete OR Archive)
- **Files:** [get-accounts-with-balances.service.ts](src/modules/accounts/services/get-accounts-with-balances.service.ts#L43-L44), [can-delete-account.service.ts](src/modules/accounts/services/can-delete-account.service.ts#L28-L35), [account-form-modal.tsx](src/modules/accounts/components/account-form-modal.tsx#L604-L621)
- **Root Cause:** `getAccountsWithBalances` passes `accountsWithTransactions` (which excludes `transaction_presets`) into `getAccountIdsInUse()`, bypassing preset lookup. Those accounts get `isDeletable: true` (hiding Archive), while tapping Delete fails in `canDeleteAccount()` with *"Archive it instead"*.
- **Manual Verification:** Create an account with 0 transactions, link it to a Transaction Preset, open Edit Account → tap trash icon → prompts permanent Delete, then fails saying to archive it with no Archive button available.

#### 16. Fresh Onboarding → Import Accounts: 4 Coupled Issues (App Kill Skips Seeding, Guided Currency Ignored, Back Traps User, `setupStrategy: "import"` Dropped)
- **Files:** [workspace.service.ts](src/modules/onboarding/services/workspace.service.ts#L87-L91), [workspace.service.ts](src/modules/onboarding/services/workspace.service.ts#L278-L286), [onboarding-screen.tsx](src/modules/onboarding/screens/onboarding-screen.tsx#L160-L169), [use-data-import.ts](src/modules/data-import/hooks/use-data-import.ts#L18-L24)
- **Root Cause:**
  1. Importing accounts writes to SQLite while onboarding is still `"pending"`; killing the app on Notifications/Ready triggers `hasAccountWorkspaceData()` auto-complete on next launch, skipping category seeding, chosen currency, nickname, and default accounts.
  2. `GuidedCurrencyStep` only updates React state, so `DataImportScreenContent` reads DB default `"PHP"` instead of the currency the user just chose.
  3. Pressing Back on Notifications remounts a blank file picker with no way forward without re-importing.
  4. `parseSetupStrategy()` omits `"import"`, dropping it to `null` after restart.
- **Manual Verification:** Fresh install → Guided Setup → pick **USD** → **Import accounts** → CSV without Currency column defaults to **PHP**; continue to Notifications → force-close & relaunch → lands on Dashboard with PHP, no nickname, and no default categories.

#### 17. Currency Upgrade (`v1.7.0 → v1.8.0`): Scrambled Currency Picker Sort Order, Boot Stall (134–155 Unbatched Commits) & Stale Catalog After Restore
- **Files:** [seed-currencies.service.ts](src/modules/currencies/services/seed-currencies.service.ts#L14-L36), [currency-preferences-provider.tsx](src/modules/currencies/providers/currency-preferences-provider.tsx#L53-L71)
- **Root Cause:**
  1. Assigns `sortOrder: code === "PHP" ? 0 : index + 1` using `index` inside `missingCodes` (1–134), colliding with existing v1.7.0 currencies (`sortOrder` 0–20) and interleaving the picker alphabetically out of order.
  2. Runs 134–155 synchronous `.insert().run()` calls outside a transaction on boot.
  3. `CurrencyPreferencesProvider` never calls `seedCurrenciesIfEmpty()` / `refreshActiveCurrencyCatalog()` after `subscribeToDatabaseReplacement`.
- **Manual Verification:** Upgrade a v1.7.0 database to v1.8.0 → open Currency Picker → verify order after `PHP` is scrambled (`AED, AFN, ALL, AUD, AMD, CAD...`).

#### 18. Quick Sync: Failed Restore Inside `QuickSyncConflictModal` Deadlocks UI in `"syncing"`
- **Files:** [quick-sync.service.ts](src/modules/google-drive-backup/services/quick-sync.service.ts#L180-L196), [quick-sync-state.ts](src/infrastructure/sync/quick-sync-state.ts#L37-L43)
- **Root Cause:** `resolveQuickSyncConflictByRestore` sets `currentStatus = "syncing"`, and on error calls `setQuickSyncRemoteConflict()` without clearing `currentStatus`. Because `getQuickSyncState` prioritizes `"syncing"` above `activeConflict`, tapping **Decide later** leaves `SyncStatusChip` pulsing forever and `QuickSyncCard` buttons permanently disabled.
- **Manual Verification:** Trigger conflict modal → enable Airplane Mode → tap **Restore Quick Sync Data** → after error appears, tap **Decide later** → chip & Quick Sync card stay stuck in **Syncing...** permanently.

#### 19. Quick Sync: Restoring Local Backup or Manual Google Drive Backup Leaves Stale Baseline & Overwrites Drive Quick Sync
- **Files:** [restore-local-backup.service.ts](src/modules/local-backup/services/restore-local-backup.service.ts#L12-L25), [restore-google-drive-backup.service.ts](src/modules/google-drive-backup/services/restore-google-drive-backup.service.ts#L26-L40)
- **Root Cause:** `quick-sync-device.json` retains `lastKnownRemoteSyncId` from *before* the restore. Restoring an older local backup (and editing 1 item) or an older manual Drive backup (1.5s after remount) sees `up_to_date` and silently overwrites newer Quick Sync data on Google Drive.
- **Manual Verification:** Sync 10 transactions via Quick Sync → restore an older 2-transaction Local Backup (then edit 1 item) or an older manual Drive backup → Drive Quick Sync is silently overwritten with the older DB.

#### 20. Quick Sync: Trashed Drive File Loops Forever + Non-ASCII/Emoji Device Labels Fail with HTTP 400 + `resetAppData` Re-Dirties Pending Changes
- **Files:** [google-drive-backup.adapter.ts](src/infrastructure/sync/adapters/google-drive-backup.adapter.ts#L309-L376), [google-drive-backup.adapter.ts](src/infrastructure/sync/adapters/google-drive-backup.adapter.ts#L745-L764), [reset-app-data.service.ts](src/modules/settings/services/reset-app-data.service.ts#L16-L56)
- **Root Cause:**
  1. **Trashed file:** Metadata check ignores trashed files (`missing`), then upload `PATCH`es the stale trashed `fileId` (returns 200 OK while staying trashed), repeating on every resume while other devices see no file.
  2. **124-byte UTF-8 limit:** Device label slices by UTF-16 code units (`.slice(0, 60)`), not UTF-8 bytes. 35 CJK chars or 26 emojis exceed Drive's 124-byte `key + value` `appProperties` limit → HTTP 400 on every sync.
  3. **`resetAppData`:** Never sets `isDatabaseReplacing()`, so deleting rows fires the SQLite update hook on every row and immediately flips `hasUnsyncedLocalChanges` back to `true`.
- **Manual Verification:**
  - Trash `kaizen-finance-quick-sync.kfb` in Drive → resume Device A → re-uploads to Trash forever; Device B sees nothing.
  - Set device label to 35 Chinese/Japanese chars or 26 emojis → tap **Sync Now** → HTTP 400 failure.

#### 21. Chat with Kai: "Manage Kai Knowledge" Doesn't Close Modal + `chat-keywords-cache` Missing Invalidation on Deletions
- **Files:** [chat-with-kai-modal.tsx](src/modules/chat-with-kai/components/chat-with-kai-modal.tsx#L570-L578), [use-chat-with-kai.ts](src/modules/chat-with-kai/hooks/use-chat-with-kai.ts#L92-L131), [chat-keywords-cache.ts](src/modules/chat-with-kai/utils/chat-keywords-cache.ts#L1-L26)
- **Root Cause:** Navigating to `/kai-knowledge` does not close `ChatWithKaiModal` (blocked behind modal on iOS; Android never reloads newly added keywords while Kai stays mounted). Deleting accounts, categories, or category presets also fails to call `invalidateChatKeywordsCache()`, and opening Kai while categories are empty caches an empty keyword map permanently.
- **Manual Verification:** Open Kai → Settings → **Manage Kai Knowledge** → add keyword `"boba"` → press Back → type `"boba 150"` → unrecognized until closing & reopening Kai (on iOS, Kai Knowledge is trapped behind Kai).

#### 22. Accounts CSV Share Deletes Cache File Too Early on Android + iOS `subscriptions` Ad Fallback Uses Android Unit ID
- **Files:** [export-accounts-csv.service.ts](src/modules/accounts/services/export-accounts-csv.service.ts#L80-L98), [ads.constants.ts](src/modules/ads/constants/ads.constants.ts#L66-L70)
- **Root Cause:**
  1. `shareAccountsCsv()` deletes the CSV in `finally` right when `Sharing.shareAsync()` resolves—on Android that happens before Gmail/Drive/WhatsApp finishes reading the URI, yielding missing/0-byte attachments.
  2. `getIosPlacementUnitId("subscriptions")` falls back to `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_SUBSCRIPTIONS` instead of `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS`.
- **Manual Verification:** On Android, Accounts → Export CSV → **Share** → Gmail/Drive (check for empty/failed attachment). On iOS production build without iOS subscriptions env var, open Subscriptions and inspect ad load error.

---

### Medium / Low Severity (v1.8.0 Regressions)

| # | Area | Issue & Location | Quick Verification |
|---|---|---|---|
| 23 | **Quick Sync** | `restoreQuickSyncBackup` / conflict restore doesn't hold `activeSyncPromise`, allowing concurrent `performSync` or `checkQuickSyncRemoteStatus` races ([quick-sync.service.ts](src/modules/google-drive-backup/services/quick-sync.service.ts#L180-L196)) | Edit a tx, within 2s tap Restore on slow network / background app. |
| 24 | **Quick Sync** | Device label sanitization mismatch (`"My  Phone"` double space vs `"My Phone"`) leaves Save button stuck active & shows misleading toast ([quick-sync-card.tsx](src/modules/google-drive-backup/components/quick-sync-card.tsx#L53-L88)) | Save `"My Phone"`, edit to `"My  Phone"`, tap Save → button stays enabled. |
| 25 | **Quick Sync** | Android `NetInfo` double-fire cancels `force: true` reconnect check behind 12s cooldown ([quick-sync-processor.tsx](src/modules/google-drive-backup/components/quick-sync-processor.tsx#L46-L96)) | Sync, toggle Airplane Mode ON, add tx, toggle OFF within 10s → may skip auto-upload. |
| 26 | **Transactions** | Amount-sort pagination breaks global order on Page 2 (groups retroactively merge into earlier date headers); date headers show partial totals across 50-item boundary ([transactions-screen.tsx](src/modules/transactions/screens/transactions-screen.tsx#L730-L766)) | Sort by Amount (Desc) on >50 tx, scroll past 50 → smaller rows jump into Page 1 date headers. |
| 27 | **Transactions** | Unchecking all labels while editing + creating/editing any label in picker reverts removed labels ([transaction-form-modal.tsx](src/modules/transactions/components/transaction-form-modal.tsx#L820-L829)) | Edit labeled tx → uncheck all → create a new label → close picker → old label returns. |
| 28 | **Calendar** | `scrollEventThrottle={16}` without in-flight guard bursts `visibleTxCount` (`50 → 100 → 150+`) in one flick; re-tapping active tab flashes skeleton ([calendar-screen.tsx](src/modules/calendar/screens/calendar-screen.tsx#L287-L309), [use-calendar-data.ts](src/modules/calendar/hooks/use-calendar-data.ts#L592-L612)) | Flick-scroll bottom on >120 tx month; tap active tab again. |
| 29 | **Budgets** | Brief flash of `"0 active categories"` / `"No all budgets configured."` on initial load ([use-budgets.ts](src/modules/budgets/hooks/use-budgets.ts#L44-L112)) | Navigate to Budgets with ≥1 budget → observe 2-frame empty flash. |
| 30 | **Dashboard** | Deleting a tx in Kai on Dashboard leaves `accounts` balances stale inside `TransactionFormModal`; manual save/delete double-calls `refreshDashboard()` ([dashboard-screen.tsx](src/modules/dashboard/screens/dashboard-screen.tsx#L310-L315)) | On Dashboard, delete a tx in Kai → open New Transaction → picker shows pre-delete balance. |
| 31 | **Accounts Export** | CSV Export filters `data.accounts` (including archived) instead of `filteredActive` when searching ([accounts-screen.tsx](src/modules/accounts/screens/accounts-screen.tsx#L197-L226)) | Search an archived account name ("No matching accounts") → Export CSV still exports it. |
| 32 | **Data Import** | *"Fill from a column in your file"* silently does nothing for new Credit Cards appearing only in `To Account` ([import-matching-cards.tsx](src/modules/data-import/components/import-matching-cards.tsx#L41-L54)) | Import Transactions CSV with CC only in `To Account` → pick CC type → Fill from column does nothing. |
| 33 | **Walkthrough** | Accounts tour shows solid dark backdrop if search hides Assets/Liabilities; Transactions tour `txFirstItem` scrolls to `y: 0` instead of centering the row ([accounts-screen.tsx](src/modules/accounts/screens/accounts-screen.tsx#L611-L666), [transactions-screen.tsx](src/modules/transactions/screens/transactions-screen.tsx#L486-L507)) | Start Accounts tour while search hides Liabilities; start Transactions tour on small phone. |
| 34 | **Chat with Kai** | Persisted session holds stale proposals after account/category delete (silent save failure); `GlobalQuickEntryHost` drops `pocketName`/`currencyCode` badges on edit; iOS modal-to-modal race from Dashboard/Transactions; `TransactionsScreen` omits `defaultCurrency` prop ([chat-with-kai-modal.tsx](src/modules/chat-with-kai/components/chat-with-kai-modal.tsx#L245-L297), [transactions-screen.tsx](src/modules/transactions/screens/transactions-screen.tsx#L1714-L1742)) | Draft Kai proposal → delete account → reopen Kai → tap Save (silent fail); set default USD → open Kai on Transactions → multi-amount chips show `₱`. |
| 35 | **Ads / Layout** | `AnchoredAdDock` causes layout jump on every focus load and floats directly above Android soft keyboard on Search screens ([anchored-ad-dock.tsx](src/modules/ads/components/anchored-ad-dock.tsx#L66-L89)) | Tap Search on Transactions/Accounts/Notes/Subscriptions on Android → ad & FAB stack on keyboard. |
| 36 | **Widgets** | `WidgetSyncProcessor` omits `budget_monthly_targets`, so editing a monthly target override doesn't refresh the Monthly Budget widget ([widget-sync-processor.tsx](src/modules/widgets/components/widget-sync-processor.tsx#L13-L20)) | Pin Monthly Budget widget → edit monthly override → widget stays stale. |

---

## Part 2 — Hidden Pre-Existing Bugs Found Across the App

1. **[HIGH — Security] Setting a new App Lock password doesn't activate auto-lock until force-restart** ([use-app-lock.ts](src/modules/security/hooks/use-app-lock.ts#L51-L118)): `AppLockGate` loads `config.isPasswordSet` once on mount and is never notified when `useSecuritySettings` saves a password. *Scenario:* Start with no password → set password → background & resume → app opens unlocked.
2. **[HIGH — Budgets] `BudgetLiveIndicator` & save-time `checkBudgetExceeded` ignore all subcategory spending on parent budgets** ([check-budget-exceeded.service.ts](src/modules/budgets/services/check-budget-exceeded.service.ts#L77-L115)): `getCategory()` never populates `.subcategories`. *Scenario:* ₱5,000 budget on `Food`, spend ₱4,500 in `Food > Groceries` → entering ₱1,000 in `Food > Dining` shows 20% used and triggers no warning.
3. **[HIGH — Budgets] Budgets screen stays stale after returning from "View transactions" & Error modal cannot be dismissed** ([use-budgets.ts](src/modules/budgets/hooks/use-budgets.ts#L61-L65), [budgets-screen.tsx](src/modules/budgets/screens/budgets-screen.tsx#L570-L576)): No `useFocusEffect` or `FINANCE_APP_TRANSACTION_MUTATED` listener, and `<NotificationModal onClose={() => {}} />` soft-locks on error.
4. **[HIGH — Calendar & Dashboard] Split transactions broken in Calendar Net tab & Dashboard Top Categories; Calendar Net labels subcategories `"Other"`** ([use-calendar-data.ts](src/modules/calendar/hooks/use-calendar-data.ts#L519-L548), [dashboard.repository.ts](src/modules/dashboard/repositories/dashboard.repository.ts#L117-L176)): Neither reads `transaction_entries` (splits omitted in Calendar Net / lumped into `"Uncategorized"` on Dashboard), and Calendar Net doesn't flatten `subcategories`.
5. **[HIGH — Subscriptions] Subscriptions saved with `categoryId = null` or `amount = 0` crash "Mark Paid"; picking `firstBillingDate = today` skips a full cycle; editing overwrites `createdAt`** ([subscription.schema.ts](src/modules/subscriptions/schemas/subscription.schema.ts#L5-L21), [record-subscription-payment.service.ts](src/modules/subscriptions/services/record-subscription-payment.service.ts#L68-L84), [save-subscription.service.ts](src/modules/subscriptions/services/save-subscription.service.ts#L60-L67)): *Scenario:* Create a subscription without selecting a category → tap **Mark Paid** → fails with `"Category is required"`. Create a monthly subscription starting today (date picker sets 00:00) → `nextRenewalDate` immediately jumps to next month.
6. **[MEDIUM–HIGH — Currencies] Weak/0-decimal currencies (`KRW`, `VND`, `IDR`, `JPY`) → `USD` fail or miscalculate by +50% in `snapshotExchangeRateFromBook`** ([currency.ts](src/utils/currency.ts#L755-L786)): Rounds `1` major unit to integer USD cents before scaling (`KRW→USD` rounds to `0` and throws; `JPY→USD` rounds to `$0.01` = +50% error; ~130 new currencies silently fall back to `1:1` with PHP).
7. **[MEDIUM–HIGH — Transactions] Multi-currency / cross-currency daily group totals & refund signs wrong** ([transactions-screen.tsx](src/modules/transactions/screens/transactions-screen.tsx#L752-L761)): Uses typed `tx.currencyCode` instead of `tx.accountCurrency` (`$10 USD` on PHP account shows `-$585.00`), sums raw mixed-currency minor units, and subtracts positive expense refunds.
8. **[MEDIUM — Credit Cards] Editing an already-billed charge amount never adjusts the statement; `issuedAmount` ignores adjustments; `billedItems` includes deleted charges** ([reconcile-credit-card-billing.service.ts](src/modules/credit-cards/services/reconcile-credit-card-billing.service.ts#L261-L276), [get-credit-card-monitoring.service.ts](src/modules/credit-cards/services/get-credit-card-monitoring.service.ts#L147-L166)).
9. **[MEDIUM — Notes] Pro limit bypass & vanishing FAB during search** ([notes-screen.tsx](src/modules/notes/screens/notes-screen.tsx#L183-L201)): Checks `notes.length >= FREE_MAX_NOTES` on the search-filtered array instead of total notes, and hides FAB when search returns 0 matches.
10. **[MEDIUM — Security / Auth] `connectGoogleDrive()` doesn't suspend App Lock** ([google-drive-auth.service.ts](src/modules/google-drive-backup/services/google-drive-auth.service.ts#L46-L60)): Returning from Google Sign-In immediately triggers `LockScreen`.
11. **[MEDIUM — Categories / Transactions / Budgets]**
    - `CategoriesScreen` doesn't refresh on focus after quick-adding a category inside `TransactionFormModal` ([use-categories.ts](src/modules/categories/hooks/use-categories.ts#L43-L48)).
    - `TransactionFormModal` Save button lacks a synchronous ref lock against rapid double-tap ([transaction-form-modal.tsx](src/modules/transactions/components/transaction-form-modal.tsx#L1477-L1802)).
    - DST off-by-1-day bugs in `daily` rollover and `biweekly` budget periods ([budget-period.ts](src/modules/budgets/utils/budget-period.ts#L56-L124)).
    - Export → Re-Import Accounts CSV silently drops archived state (re-importing archived accounts as active), pockets, maintaining balance, hide flags, and same-name multi-currency accounts, and lacks CSV formula-injection neutralization (`=`, `+`, `-`, `@`).

---

## Part 3 — Performance Assessment (60–120fps Standard)

### Major Wins Shipped in v1.8.0
- **Keyset SQLite pagination + partial index (`0048_add_transactions_active_feed_index`)** bounds Transactions feed & running balances to 50 rows instead of full-ledger scans.
- **Fast-path `runSafeMigrations`** skips schema/FK/hex-color checks on already-current boots.
- **`BudgetLiveIndicator` snapshot/eval split** eliminates per-keystroke SQLite queries while typing amounts.
- **Two-pointer `getAccountBalanceDeltasAtDates`** reduces Net Worth History from `O(K * N)` to `O(N + K log K)`.
- **Modal early-return gating (`if (!visible) return null`)**, `AdBanner` focus gating, staggered foreground resume delays (1s / 1.5s / 2s), `chat-keywords-cache`, and chunked `IN (...)` lookups for labels & note attachments.

### Remaining 60–120fps Bottlenecks to Address
1. **Severe Startup Stall (Upgrade/First Boot):** `seedCurrenciesIfEmpty()` executes **134–155 unbatched synchronous SQLite `INSERT`s outside a transaction** on the JS thread (~150ms–1.5s freeze on Android). `seedDefaultCategoriesIfEmpty()` is also unbatched.
2. **Picker Scroll/Mount Jank:** `CurrencyPickerModal` renders all **155 currencies in a `<ScrollView>`** instead of `FlatList` (~1,000+ mounted nodes on open & every search keystroke).
3. **Trash Full-Ledger Double Scan:** `listDeletedTransactions()` calls `getBalanceAfterByTransactionId(null)` and `getPocketBalanceAfterByTransactionId(null)` whenever Trash has ≥1 item—scanning ALL active transactions twice for maps whose keys never match deleted rows.
4. **Global Search Mount Storm & Un-Debounced SQL:** Opening Search mounts 8 domain hooks immediately (including `useScheduledTransactions()`, which runs DB writes!) and runs synchronous `LIKE '%...%'` queries on every keystroke.
5. **Unneeded Synchronous Work on Focus/Navigation:**
   - `useCalendarData` runs `getCalendarMonthTransactions` synchronously in `useState` init and `getCalendarScheduleOccurrences` synchronously in `useMemo`; `getPocketBalanceDeltasAtDate` scans all history and filters in JS.
   - `useFundGroups` runs synchronously in `useFocusEffect` and then runs a second time after `useAccounts` resolves.
   - `useSubscriptions` queries synchronously in `useFocusEffect` without `runDeferredSyncQuery`.
   - `DashboardScreen` calls `getAccountsWithBalances` twice per focus (once with `includeManagementFlags: true` inside `getDashboardSummary` even though Dashboard never reads management flags).
   - `reconcileAccount` still performs an `O(T * (S + E))` SQLite query loop inside write transactions.
   - `resetAppData` triggers SQLite update-hook reads on every deleted row because `isDatabaseReplacing()` isn't set.
   - `transactions-screen` CSV export runs synchronously with `includeBalances: true` (two full-ledger scans for unused columns).
   - Unchunked `IN (...)` queries remain in `getCategoryExpenseTotal` / `getCategoryExpenseTotalsGrouped` / `listExpenseEntryTotalsByCategory` (>500 categories risk).

---

## Part 4 — Complete Pre-Release Manual QA Checklist

Organized by every feature area touched across the 187 changed/added files since `v1.7.0`:

### 1. Upgrade, Migration, Backup & Reset
- [ ] **v1.7.0 → v1.8.0 in-place upgrade** with existing accounts, transfers, splits, attachments, subscriptions, and schedules: verify clean boot, `transactions_active_feed_index` created, fast-path on second boot.
- [ ] **Local Backup restore** (v1.7.0 & v1.8.0 `.kfb`): verify `forceFullCheck` runs, all tables (including `subscriptions`, `notes`, `goals`, `budgets`) restore, and UI remounts cleanly.
- [ ] **Google Drive Manual Backup restore** while Quick Sync is enabled: verify no unintended silent overwrite of Drive Quick Sync.
- [ ] **Reset App Data & Forgot Password Emergency Reset**: verify clean DB wipe, Drive disconnect, `hasUnsyncedLocalChanges = false`, clean remount to onboarding, and no crash after heavy transaction history.

### 2. Quick Sync, Multi-Device Conflicts & Device Labels
- [ ] **Two-device conflict flow**: Device A syncs → Device B links same Google account & enables Quick Sync → conflict modal shows Device A label & timestamp → verify **Restore Quick Sync Data**, **Overwrite Data**, and **Decide later** (header chip turns **"Update available"** and reopens modal).
- [ ] **Same-device self-writer**: Edit & sync on Device A → background/resume → verify no false conflict modal.
- [ ] **Post-Reset re-enable** *(Bug #1)*: Sync → Reset App Data → reconnect same Google account → enable Quick Sync → verify cloud backup is **not** silently overwritten.
- [ ] **Mid-upload edit** *(Bug #2)*: Slow network → add Tx A → while Syncing, add Tx B → verify Tx B uploads after Tx A.
- [ ] **Failed conflict restore** *(Bug #18)*: Trigger conflict → Airplane Mode → tap Restore → dismiss → verify UI does **not** deadlock in "Syncing...".
- [ ] **Mixed v1.7.0 + v1.8.0 devices** *(Bug #3)* & **v1.7.0 upgrade with clock skew**.
- [ ] **Trashed Drive file** *(Bug #20)*: Move Quick Sync file to Drive Trash → resume app → verify recovery.
- [ ] **Device Labels**: Save standard label, clear to reset (verify *"Device label saved."* / *"Device label reset to default."* toasts), test consecutive spaces (`"My  Phone"`), and test 35+ CJK chars / 26+ emojis *(Bug #20)*.
- [ ] **Offline → Online & Wi-Fi-Only toggle**: Add edits offline → reconnect Wi-Fi vs cellular → verify expected sync or *"Waiting for Wi-Fi"*.
- [ ] **App Lock + Quick Sync** *(Bug #4 & Pre-existing #1, #10)*: Verify conflict modal does not pop over `LockScreen`, newly set password locks immediately without restart, and Google Sign-In doesn't trigger re-lock.

### 3. Accounts, Accounts CSV Export & Credit Cards
- [ ] **Account CRUD + Preset Deletion** *(Bug #15)*: Test account with 0 transactions + 1 Transaction Preset → verify Archive vs Delete works cleanly.
- [ ] **Collapse / Expand All & Individual Groups**: Toggle chips, verify persistence and balance summaries; verify Fund Groups totals sync after recording a transaction.
- [ ] **Accounts CSV Export**:
  - **Save to device** (verify UTF-8 BOM, 0/2/3-decimal currencies, quoted commas/newlines/quotes, pockets summary, credit card fields).
  - **Share** on physical Android (Gmail, Drive, WhatsApp) & iOS *(Bug #22)*.
  - Search for an archived account ("No matching accounts") → tap Export CSV *(Bug #31)*.
- [ ] **Credit Cards (Manual & Imported)**: Create/edit/import credit card with credit limit (`0`, normal, negative rejection), statement day & due day (`1`, `29`, `30`, `31`, invalid `0`/`32`), verify monitoring, billing reconciliation, and deletion of card with opening balance.

### 4. Data Import & Guided Onboarding
- [ ] **Data Import (Accounts & Transactions)**:
  - Pre-selected route params (`/data-import?kind=accounts` & `kind=transactions`).
  - Inline **+ Add new account type** during account matching.
  - Credit card required details validation (manual entry + *"Fill from file column"*, including CC only in `To Account` *(Bug #32)*, and currency-prefixed limit sample warning).
  - Free 5-account limit banner, excluding rows to fit limit, and **Unlock Pro** CTA.
  - Round-trip re-import of an exported Accounts CSV.
- [ ] **Onboarding (Fresh & Sample Exit)**:
  - **Sample Mode → Start personal workspace → Guided Setup → Import accounts** (Free & Pro) *(Bug #6)*.
  - **Fresh Guided Setup**: Currency search (`JPY`, `Euro`, `€`, scroll indicator) → pick **USD** → **Import accounts** (check default currency, Back from Notifications, force-kill on Notifications/Ready, and Finish Setup) *(Bug #16)*.
  - Standard Guided Setup (Recommended & Start from scratch) still completes cleanly.

### 5. Transactions (Pagination, Filters, Export, Form Skeleton)
- [ ] **Keyset Pagination & Sorting**: >120 transactions (including timestamp ties, transfers with fees, cross-currency, splits, labels) across all 4 sorts (`Date Desc/Asc`, `Amount Desc/Asc`) → verify 0 missing/duplicate rows, accurate running balances, and date-header totals *(Bug #26)*.
- [ ] **Filters & Trash**: Account (incl. transfer destination), Parent Category (incl. subcategories & splits), Labels, Custom Date Range, Search with `%` / `_` / `\`, Trash delete/restore/permanent delete.
- [ ] **Transactions CSV Export**: With >100 filtered rows, verify all matching rows export in active sort order.
- [ ] **Transaction Form & Skeleton**:
  - Deep-link **Record Transfer** from Global Search & Transfer widget on cold launch *(Bug #10)*.
  - Quick entry via Shake & FAB → instant skeleton, responsive Close (`✕`), no double-submit on rapid Save taps.
  - Edit labeled tx → remove all labels → create new label in picker *(Bug #27)*.

### 6. Calendar, Budgets & Dashboard
- [ ] **Calendar**:
  - Post / Skip a due schedule on Schedules tab *(Bug #5)*.
  - Rapid Next → Prev month toggling *(Bug #11)*.
  - Balance Sheet tab with pocket-enabled accounts & switching days *(Bug #12)*.
  - Scroll pagination on >120-tx month & re-tapping active tab *(Bug #28)*.
  - Net tab Top Expense Categories with subcategories & split expenses.
- [ ] **Budgets**:
  - Toggle active budget (with spending & rollover) OFF and ON *(Bug #13)*.
  - Parent category budget + subcategory spending in `BudgetLiveIndicator` & save-time warning.
  - Tap **View transactions** → add/delete expense → Back → verify Budgets updates.
  - Check initial load flash *(Bug #29)* and multi-currency / rollover frequencies.
- [ ] **Dashboard**:
  - Return to Dashboard / pull-to-refresh / mutate tx (including Net Worth `ALL` + year selected) → check `"No prior month"` flash & chart collapse *(Bug #14)*.
  - Delete a tx inside Kai on Dashboard → open New Transaction → verify account balance in picker *(Bug #30)*.
  - Split expenses in Top Categories; Recent Transactions with transfer+fee.

### 7. Global Search
- [ ] Search for **Notes** *(Bug #8)*, **Transfers** (no duplicates), **Split transaction categories**, literal `%` / `_` *(Bug #9)*, Accounts, Pockets, Categories, Budgets, Goals, Subscriptions, Schedules, and Labels.
- [ ] Tap a transaction beyond Page 1 → inspector opens correctly (including transfers).

### 8. Chat with Kai
- [ ] Personalized suggested prompts (0, 1, 2+ accounts across `en`, `fil`, `es`; archived/hidden excluded).
- [ ] Session persistence across close/reopen & across Dashboard / Transactions / Shake; manual Reset clears session.
- [ ] **Edit & Delete saved Expense, Income, AND Transfer** *(Bug #7)*.
- [ ] Settings → **Manage Kai Knowledge** on iOS & Android → add/edit keyword → immediately test in Kai *(Bug #21)*.
- [ ] Delete account/category with keywords or drafted proposal → reopen Kai → verify parsing & save error handling.
- [ ] Open Kai from **Transactions** with non-PHP default currency *(Bug #34)*; test iOS Kai → Edit → Form → Back to Kai transition.

### 9. Ads (`AnchoredAdDock`), Currencies, Walkthroughs & Remaining Modules
- [ ] **`AnchoredAdDock` across all 11 screens** (Pro = 0px / no requests; Free online = safe-area clear, FABs & bottom items reachable; Free offline = clean collapse; Android Search keyboard behavior *(Bug #35)*; iOS `subscriptions` unit ID *(Bug #22)*).
- [ ] **Currencies**: v1.7.0 → v1.8.0 picker sort order *(Bug #17)*, 155-item scroll/search smoothness, 0-decimal (`JPY`/`KRW`/`VND`) & 3-decimal (`KWD`) formatting and cross-currency entry.
- [ ] **Walkthroughs**: Accounts 9-step tour (normal, collapsed, and filtered search) & Transactions tour (0 tx vs ≥1 tx on small viewport) *(Bug #33)*.
- [ ] **Notes, Categories, Subscriptions, Goals, Reports, Widgets**: Notes search Pro-limit check; Categories focus refresh; Subscription creation without category / today start date / Mark Paid; Android widgets refresh on transaction & monthly budget target override *(Bug #36)*.
