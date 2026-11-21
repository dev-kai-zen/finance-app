# v1.8.0 Step-by-Step Bug Remediation & Verification Tracker

Use this document as our living checklist as we fix and verify each finding one by one (or in small, isolated batches) without introducing regressions.

## How We Will Work Through This Plan
1. **One Finding / Small Isolated Batch at a Time:** We will never apply sweeping multi-module changes in one blow.
2. **Automated + Manual Gate After Every Fix:**
   - Run `npx tsc --noEmit` (0 type errors)
   - Run targeted unit/integration test (`node --test ...`) + full `npm test`
   - Perform the **Post-Fix Verification Scenario** below
   - Mark the item `[x] Resolved & Verified` in this file before moving to the next item.
3. **60–120fps Performance Discipline (`AGENTS.md` §19):** Every fix below has been designed to keep JS frame work under 8.3ms–16.6ms, avoid duplicate mount/focus queries, preserve modal early-return gating, and bound SQLite work.

---

## Execution Order (Recommended Phases)

| Phase | Scope | Findings Covered |
|---|---|---|
| **Phase 1** | **Quick Sync Data Safety & App Lock Security** | Part 1 `#1`, `#2`, `#3`, `#4`, `#18`, `#19`, `#20`, `#23`, `#24`, `#25` + Part 2 `#1`, `#10` |
| **Phase 2** | **Onboarding & Data Import (Sample Mode + Fresh Setup + Credit Card Fill)** | Part 1 `#6`, `#16`, `#32` |
| **Phase 3** | **Chat with Kai (Transfers, Knowledge Modal, Cache & Session Safety)** | Part 1 `#7`, `#21`, `#34` |
| **Phase 4** | **Global Search (Notes, Transfers, Split Categories & Wildcards)** | Part 1 `#8`, `#9` + Part 3 `#4` |
| **Phase 5** | **Calendar & Schedules (Post/Skip Refresh, Skeleton Lock, Balance Sheet, Splits)** | Part 1 `#5`, `#11`, `#12`, `#28` + Part 2 `#4` |
| **Phase 6** | **Transactions & Accounts (Transfer Deep-Link, Presets Delete/Archive, CSV Share/Export, Labels, Sort/Totals)** | Part 1 `#10`, `#15`, `#22`, `#26`, `#27`, `#31` + Part 2 `#7`, `#11` |
| **Phase 7** | **Budgets & Dashboard (Toggle OFF Spend, Parent/Subcategory Live Indicator, Focus Refresh, Net Worth Chart)** | Part 1 `#13`, `#14`, `#29`, `#30` + Part 2 `#2`, `#3` |
| **Phase 8** | **Currencies, Subscriptions, Credit Cards, Notes, Walkthroughs, Ads & Widgets** | Part 1 `#17`, `#33`, `#35`, `#36` + Part 2 `#5`, `#6`, `#8`, `#9` |
| **Phase 9** | **60–120fps Performance Polish (Startup Batching, Currency FlatList, Trash Scan, Focus Deferral)** | Part 3 `#1`, `#2`, `#3`, `#4`, `#5` |

---

# Part 1 — v1.7.0 → v1.8.0 Regressions (36 Findings)

---

## Critical (Release Blockers)

### [x] P1-01 — Quick Sync: App Reset Preserves `deviceId`, Silently Overwriting Cloud Backup with an Empty Database (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/infrastructure/sync/quick-sync-device.storage.ts`
  - `src/modules/google-drive-backup/services/reset-google-drive-for-app-reset.service.ts`
  - `src/modules/settings/services/reset-app-data.service.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. On Device A with transactions and **Quick Sync ON**, tap **Sync Now** until status shows **Synced**.
  2. Go to **Settings → Reset App Data**, confirm reset, and complete onboarding with a fresh empty workspace.
  3. Go to **Settings → Google Drive Backup**, reconnect the same Google account, dismiss any restore prompt, and toggle **Quick Sync ON**.
  4. **Bug Observed:** No conflict modal appears; the empty local workspace immediately uploads and overwrites the cloud Quick Sync backup.
- **How We Will Properly Fix It:**
  1. In `quick-sync-device.storage.ts`, update `clearQuickSyncTrackingState()` (or add `resetQuickSyncDeviceIdentityForAppReset()`) so an app reset rotates `deviceId: randomUUID()`, clears `customDeviceName: null`, and resets all `lastKnownRemote*` fields and `hasUnsyncedLocalChanges: false`.
  2. In `resetAppData()` (`reset-app-data.service.ts`), wrap the table deletion transaction with `setDatabaseReplacing(true)` / `finally { setDatabaseReplacing(false) }` so deleting rows during reset does not fire the SQLite update listener and re-mark `hasUnsyncedLocalChanges = true`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Repeat the exact 3 steps above after resetting app data.
  2. **Expected Result:** As soon as you toggle **Quick Sync ON** after reconnecting, the **Quick Sync Conflict Modal** immediately appears showing your previous cloud backup and asking whether to **Restore Quick Sync Data** or **Overwrite Data**. Cloud data is never silently overwritten.

---

### [x] P1-02 — Quick Sync: Edits Made During an In-Flight Upload Are Dropped and `hasUnsyncedLocalChanges` Is Cleared (Implemented — Ready for User Verification)
- **User Test Status & Question:** *"I test it, while the sync chip is blinking, I tried to immediately add transaction or delete transactions, then after it syncs, it resync again, if my fail is not the proper way, let me know how we properly fix it"*
- **Why You Saw It Resync During Your Test:**
  - Every edit starts a **3-second debounce timer** (`DEBOUNCE_DELAY_MS = 3000`).
  - On a fast Wi-Fi connection, a small database upload finishes in **~1–1.5 seconds**. So when you added a transaction while the chip was blinking, the first upload finished *before* your 3-second debounce timer fired. When the 3s timer fired at `t = 3.0s`, `activeSyncPromise` was already `null`, so a second sync ran normally!
  - **When the bug actually strikes:** When the upload takes **longer than 3 seconds** (e.g., slower mobile data, larger DB, or when an immediate sync is triggered while an upload is still running). At `t = 3.0s`, the debounce timer fires *while* the first upload is still in flight (`activeSyncPromise !== null`). `triggerQuickSync()` hits `if (activeSyncPromise) return activeSyncPromise;` and drops the follow-up sync, and when the first upload finishes at `t = 4.5s`, it unconditionally sets `hasUnsyncedLocalChanges: false`—permanently marking your new transaction as "Synced" even though the snapshot uploaded at `t = 0s` didn't contain it!
- **Files:**
  - `src/modules/google-drive-backup/services/quick-sync.service.ts`
- **Before-Fix Scenario (How to Reproduce Consistently):**
  1. In Chrome DevTools / Network Link Conditioner (or with slow hotspot / throttled upload > 5 seconds), add **Transaction A** and wait 3 seconds for the header chip to start blinking **Syncing...**.
  2. Immediately (within the first second of **Syncing...**) add **Transaction B**, while the first upload takes another 4+ seconds to complete.
  3. Wait for **Syncing...** to finish.
  4. **Bug Observed:** After the first upload finishes (>3s after Transaction B was added), the chip turns **Synced** and never triggers a second upload for Transaction B.
- **How We Will Properly Fix It:**
  1. Add a monotonic `localChangeGeneration` counter (incremented every time `queueLocalSyncChange` runs) and a `pendingFollowUpSync` boolean flag in `quick-sync.service.ts`.
  2. Snapshot `const syncGeneration = localChangeGeneration` right before `createLocalBackupSnapshot()` in `performSync()`.
  3. If `triggerQuickSync` is called while `activeSyncPromise` is running, set `pendingFollowUpSync = true`.
  4. When the upload completes, only set `hasUnsyncedLocalChanges = false` and status `"synced"` if `localChangeGeneration === syncGeneration && !pendingFollowUpSync`. If `localChangeGeneration > syncGeneration || pendingFollowUpSync`, keep `hasUnsyncedLocalChanges = true` and immediately chain a follow-up sync after `activeSyncPromise` clears.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Add a unit test in `quick-sync.service.test.ts` that simulates a 5-second upload and calls `queueLocalSyncChange()` at `t = 1s` (so the 3s debounce fires at `t = 4s` while upload #1 is still in flight).
  2. **Expected Result:** Upload #1 completes at `t = 5s`, `hasUnsyncedLocalChanges` remains `true`, and Upload #2 automatically runs immediately after Upload #1 to sync Transaction B.

---

### [x] P1-03 — Quick Sync: Mixed v1.8.0 + v1.7.0 Devices Miss Conflicts (Google Drive `PATCH` Merges `appProperties`) (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (*"it overwrites the data of Device B"*)
- **Files:**
  - `src/infrastructure/sync/quick-sync-conflict.ts`
  - `src/infrastructure/sync/adapters/google-drive-backup.adapter.ts`
  - `src/infrastructure/sync/quick-sync-device.storage.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Sync Quick Sync from Device A (v1.8.0).
  2. Add a transaction and sync Quick Sync from Device B (v1.7.0) on the same Google account.
  3. Resume Device A (v1.8.0) and add a transaction.
  4. **Bug Observed:** Device A does not detect Device B's upload and overwrites Device B's data.
- **How We Will Properly Fix It:**
  1. In `detectRemoteAhead()` (`quick-sync-conflict.ts`), check **both** `syncRevisionId !== local.lastKnownRemoteSyncId` **and** `headRevisionId !== local.lastKnownRemoteHeadRevisionId` (instead of only checking `headRevisionId` when `syncRevisionId` is absent). If `syncRevisionId` stayed identical while `headRevisionId` changed (or `modifiedTime` advanced beyond `lastKnownRemoteModifiedTime`), treat the remote file as modified by a legacy v1.7.0 writer (`isLegacyOverwrite = true`).
  2. In `evaluateQuickSyncRemoteState()`, only allow `adopt_self` when `remoteFile.lastUpdatedByDeviceId === local.deviceId` **and** `!isLegacyOverwrite`. When a v1.7.0 upload advanced `headRevisionId`/`modifiedTime` without advancing `syncRevisionId`, ignore the stale `lastUpdatedByDeviceId` left behind by Drive `PATCH` and return `remote_ahead` so the conflict modal protects Device B's data.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Repeat the Device A (v1.8.0) → Device B (v1.7.0) → Device A (v1.8.0) sequence.
  2. **Expected Result:** Resuming or syncing on Device A immediately opens the **Quick Sync Conflict Modal** instead of overwriting Device B's backup.

---

### [x] P1-04 — Quick Sync: `QuickSyncConflictModal` Renders Over `AppLockGate` Lock Screen (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/security/components/app-lock-gate.tsx`
  - `src/modules/security/hooks/use-app-lock.ts`
  - `src/modules/google-drive-backup/components/quick-sync-processor.tsx`
- **Before-Fix Scenario (How to Reproduce):**
  1. Enable App Lock password on Device A (with Quick Sync ON) and restart the app so the lock screen appears.
  2. Upload newer Quick Sync data from Device B.
  3. Open/resume Device A to the Lock Screen and wait ~2 seconds without unlocking.
  4. **Bug Observed:** `QuickSyncConflictModal` pops up on top of the password lock screen and allows restoring or overwriting without entering the password.
- **How We Will Properly Fix It:**
  1. Expose reactive lock state (`isAppLocked` / `subscribeAppLockState`) from `src/modules/security`.
  2. In `QuickSyncProcessor`, pause automatic foreground/network sync checks while `isAppLocked === true`, and do not set `visible={activeConflict !== null && !isAppLocked}` on `QuickSyncConflictModal` until the user unlocks the app.
  3. Trigger the deferred remote check 1.5s *after* `isAppLocked` transitions from `true` → `false`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Repeat the scenario above while Device A sits on the Lock Screen for 10+ seconds.
  2. **Expected Result:** No modal appears over the Lock Screen. As soon as you enter your password and unlock, the conflict check runs and presents `QuickSyncConflictModal`.

---

### [x] P1-05 — Calendar: Posted / Skipped Schedules Never Update Until Switching Months (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/calendar/hooks/use-calendar-data.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Open **Calendar → Schedules** tab on a month with a due or upcoming schedule occurrence.
  2. Tap **Post Now** (or **Skip**) and confirm.
  3. **Bug Observed:** The schedule card remains stuck in **Due / Upcoming** with active Post/Skip buttons until you switch to another month and come back.
- **How We Will Properly Fix It:**
  1. In `useCalendarData` (`src/modules/calendar/hooks/use-calendar-data.ts`), add a dedicated `scheduleRefreshVersion` counter (or include `transactions` in `monthScheduleOccurrences`'s dependency array and bump `scheduleRefreshVersion` inside `postOccurrence`, `skipOccurrence`, and `refreshAll`).
  2. Ensure `monthScheduleOccurrences` recomputes immediately whenever a schedule occurrence is posted, skipped, or refreshed.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open **Calendar → Schedules** tab and tap **Post Now** or **Skip** on a due schedule.
  2. **Expected Result:** The card immediately updates to **Posted** (or **Skipped**) in place without switching months.

---

### [x] P1-06 — Onboarding + Data Import: Sample Mode → Guided Setup → Import Accounts Fails & Wipes Imported Accounts on Finish (Implemented — Ready for User Verification)
- **User Test Status & Question:** *"Free users are blocked by the 5 account limit, Pro users, I successfully import 32 accounts, let me know what is the problem?"*
- **Why You Succeeded as Pro and What the Exact Bug Is:**
  - When you tested on **Fresh Onboarding** (after Reset App Data), onboarding status is `"pending"` and there are `0` sample accounts in SQLite—so Free users hit the 5-account limit on a 32-account CSV (`32 > 5`), and Pro users succeed in importing 32 accounts.
  - **The bug happens when starting from Sample Mode** (or even on Fresh Onboarding if you trace what happens on Sample exit):
    1. If a user first chooses **"Explore sample data first"** (which loads **7 sample accounts** and sets `workspace.mode = "sample"` and `onboarding.status = "completed"`), and later taps **"Start your personal workspace" → "Browse all setup options" → "Get Started" → "Import accounts"**:
    2. **Problem A (Free user blocked even on a 1-account CSV):** Because the 7 sample accounts are still in the database while previewing the CSV, `getImportCatalog()` counts `7 existing sample accounts + 1 CSV account = 8 > 5`, blocking Free users even when importing just 1 account!
    3. **Problem B (Import fails with `"workspace"` error in Sample-to-Personal setup):** When tapping **Import**, `commitImport()` calls `canImportWorkspaceData()`, which returns `false` because `status === "completed"` and `workspaceMode === "sample"`.
    4. **Problem C (Silent data wipe on "Finish Setup"):** Even if `commitImport()` is allowed during Sample-to-Personal transition, `commitImport()` calls `clearSampleWorkspaceIfNeeded(tx)` (deleting the 7 sample accounts) **without** updating `workspaceMode` from `"sample"`. Then, when the user finishes the remaining 2 onboarding steps (Notifications → Ready → **"Finish Setup"**), `completeGuidedSetup()` calls `clearSampleWorkspaceIfNeeded(tx)` a **second time**—which still sees `workspaceMode === "sample"` and **permanently deletes all 32 accounts the user just imported!**
- **Files:**
  - `src/modules/onboarding/services/is-personal-workspace.service.ts`
  - `src/modules/onboarding/services/workspace.service.ts`
  - `src/modules/data-import/services/import-catalog.service.ts`
  - `src/modules/data-import/services/commit-import.service.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Reset App Data → on the Welcome screen tap **"Explore sample data first"**.
  2. On the Dashboard sample banner, tap **"Start your personal workspace"** → **"Browse all setup options"** → **"Get Started"**.
  3. Complete Nickname, Language, Currency → on Accounts step choose **"Import accounts"**.
  4. Pick a valid **1-account CSV** (as Free user) or **32-account CSV** (as Pro user) and tap **Import**.
  5. **Bug Observed:** Free user is blocked by the 5-account limit even for 1 account (because 7 sample accounts are counted); Pro user gets *"Import is only available in your personal workspace."*
- **How We Will Properly Fix It:**
  1. When `clearSampleWorkspaceIfNeeded(tx)` executes inside `commitImport()` (or when exiting Sample Mode into personal setup), immediately transition `ONBOARDING_SETTING_KEYS.workspaceMode` away from `"sample"` (e.g., set `status = "pending"` / `workspaceMode = "personal"`) so a subsequent call to `clearSampleWorkspaceIfNeeded(tx)` in `completeGuidedSetup()` never wipes the newly imported accounts.
  2. Update `getImportCatalog()` so that when `workspaceMode === "sample"` (user is importing to replace sample data), sample accounts are excluded from the existing active account count and duplicate-matching catalog.
  3. Update `canImportWorkspaceData()` (or pass onboarding import context) so importing accounts from the Sample-to-Personal Guided Setup flow is permitted.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Enter **Sample Mode** → tap **"Start your personal workspace"** → Guided Setup → **"Import accounts"**.
  2. As a Free user, import a 3-account CSV (or as Pro, import your 32-account CSV), then continue through Notifications → Ready → tap **"Finish Setup"**.
  3. **Expected Result:** Import succeeds, sample data is cleared once, and upon landing on the Dashboard/Accounts screen, all 3 (or 32) imported accounts are present and intact.

---

### [x] P1-07 — Chat with Kai: Editing OR Deleting ANY Saved Transfer Always Fails (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/chat-with-kai/components/chat-with-kai-modal.tsx`
  - `src/modules/transactions/services/delete-transaction.service.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Open **Chat with Kai**, type `"Transfer 2000 from Cash to Bank"`, and tap **Save**.
  2. On the saved card in chat, tap **Edit**, change the amount to `2500`, and tap **Save** → **Fails**.
  3. Tap **Delete** on the saved transfer card and confirm → **Dialog closes silently, transfer is NOT deleted**.
- **How We Will Properly Fix It:**
  1. In `chat-with-kai-modal.tsx` (`handleEdit`), when `proposal.type === "transfer"` (or `proposal.transactionId.startsWith("tgrp_")`), pass `transactionGroupId: proposal.transactionId` into `draftItem` (or look up the real transaction legs via `getTransactionById` / group lookup) instead of hardcoding `transactionGroupId: null`.
  2. In `deleteTransaction()` (`delete-transaction.service.ts`), if no row matches `WHERE transactions.id = id` and `id.startsWith("tgrp_")` (or always check `WHERE transactions.id = id OR transactions.transaction_group_id = id LIMIT 1`), resolve the transfer group and soft-delete both legs atomically.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. In **Chat with Kai**, save a transfer `"Transfer 2000 from Cash to Bank"`.
  2. Tap **Edit**, change amount to `2500`, tap **Save** → updates cleanly to `₱2,500.00` in both Kai and Transactions.
  3. Tap **Delete** and confirm → card updates to Deleted and both transfer legs move to Trash.

---

## High Severity (Part 1)

### [x] P1-08 — Global Search Never Returns Notes (`notes` Permanently `[]`) (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/search/hooks/use-general-search.ts`
  - `src/modules/notes/hooks/use-notes.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Create a Note titled `"Tax Docs"`.
  2. Open **Global Search** (magnifying glass) and type `"Tax Docs"`.
  3. **Bug Observed:** 0 Note results appear.
- **How We Will Properly Fix It:**
  1. In `useGeneralSearch` (`src/modules/search/hooks/use-general-search.ts`), pass `useNotes({ skipQuery: !isOpen })` (keeping `autoRefresh: true` when `isOpen` becomes `true`, or trigger `refreshNotes()` when `isOpen` and debounced query are active).
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open Global Search and type `"Tax Docs"`.
  2. **Expected Result:** The `"Tax Docs"` note appears under the **Notes** section and opens when tapped.

---

### [x] P1-09 — Global Search Transactions: Duplicate Transfer Legs, Missing Split Categories & Unescaped SQL `LIKE` Wildcards (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (All 3 cases confirmed)
- **Files:**
  - `src/modules/transactions/services/search-transactions.service.ts`
  - `src/modules/search/hooks/use-general-search.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Search a transfer name → shows 2 duplicate rows (`-₱...` and `₱...`).
  2. Search a category used only inside a split expense → returns 0 matches.
  3. Search `%` → returns up to 8 unrelated transactions.
- **How We Will Properly Fix It:**
  1. In `searchTransactionsByQuery` (`search-transactions.service.ts`):
     - Escape `%`, `_`, and `\` in the user query and use `ESCAPE '\'` (matching `transactions.repository.ts`).
     - Apply `canonicalLogicalTransactionCondition()` so each transfer only returns its canonical primary leg once.
     - Add an `EXISTS` subquery against `transaction_entries` joined to `categories` so split-transaction child categories and notes match the search query.
     - Select `accounts.currencyCode` (`accountCurrency`) so `useGeneralSearch` formats `amountMinorUnits` using the account's actual currency.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Search a transfer name → returns **1 single transfer row**.
  2. Search a split child category name → returns the split transaction.
  3. Search `%` → returns **0 results** (unless a transaction literally contains `%`).

---

### [x] P1-10 — Deep-Linking / Quick-Opening a New Transfer Resets Form Mode to "Expense" (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/transactions/components/transaction-form-modal.tsx`
- **Before-Fix Scenario (How to Reproduce):**
  1. Force-close and reopen the app (with ≥2 active accounts).
  2. Open **Global Search** → tap **Record Transfer** (or tap the Android **Quick Transfer** home screen widget).
  3. **Bug Observed:** The transaction form opens on the **Expense** tab instead of **Transfer**.
- **How We Will Properly Fix It:**
  1. In `TransactionFormModalContent` (`transaction-form-modal.tsx`), exposed `loading: accountsLoading` from `useAccounts()`.
  2. In the guard `useEffect` at line 1152 (`if (!allowTransfer && mode === "transfer")`), do **not** downgrade `mode` to `"expense"` while `accountsLoading` is still `true` (before deferred accounts have finished loading).
  3. Once `accounts` finishes loading and `mode === "transfer"`, auto-populate `transferToAccountId` if it was initially empty.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Force-close and reopen the app, then tap **Record Transfer** from Global Search (or the Android Quick Transfer widget).
  2. **Expected Result:** The form opens and stays on the **Transfer** tab with From and To accounts ready.

---

### [x] P1-11 — Calendar: Permanent Loading Skeleton Deadlock on Rapid Month Toggle (`A → B → A`) & Unintended Month Jump on Padding Day Tap (Implemented — Ready for User Verification)
- **User Test Status & Observation:** *"I can't verify it properly but what I notice it jumps to different month"*
- **Why You Noticed It Jumping to a Different Month & Why the Deadlock Is Hard to Hit Manually:**
  1. **Why it jumped months:** In `use-calendar-data.ts` (`toggleSelectDay`, line 584), tapping any leading/trailing padding day cell on the first or last row of the calendar grid (e.g. tapping Oct 30 or Dec 2 while viewing November) automatically switches `activeMonth` to that adjacent month!
  2. **Why the skeleton deadlock happens:** When `activeMonth` changes from Month A → Month B, `useEffect` sets `isMonthLoading = true` and waits 2 animation frames (~32ms) via `scheduleAfterPaint`. If `activeMonth` switches back to Month A within that ~32ms window (before Month B finishes loading), `loadedMonthKeyRef.current` is still `"Month A"`, so the effect hits `if (loadedMonthKeyRef.current === key) return;` at line 89 **without calling `setIsMonthLoading(false)`**, freezing the calendar on the loading skeleton forever!
- **Files:**
  - `src/modules/calendar/hooks/use-calendar-data.ts`
- **Before-Fix Scenario (How to Reproduce Consistently):**
  1. Open **Calendar**.
  2. With two fingers (left thumb on `<` Prev Month, right thumb on `>` Next Month), tap `>` and immediately `<` within a fraction of a second (or tap a gray padding day from next month and immediately tap `<`).
  3. **Bug Observed:** Calendar grid gets stuck on the gray loading skeleton permanently until you tap another month.
- **How We Will Properly Fix It:**
  1. In `useCalendarData` (`src/modules/calendar/hooks/use-calendar-data.ts` line 89), when `loadedMonthKeyRef.current === key`, always call `setIsMonthLoading(false)` before returning:
     ```ts
     if (loadedMonthKeyRef.current === key) {
       setIsMonthLoading(false);
       return;
     }
     ```
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Rapidly tap `>` and `<` back-to-back on the Calendar month header.
  2. **Expected Result:** The calendar never freezes on the skeleton loader and always settles cleanly on the selected month.

---

### [x] P1-12 — Calendar Balance Sheet Tab: Flashes `₱0.00` / Previous Day's Data & Breaks Default Pocket Auto-Expansion (Implemented — Ready for User Verification)
- **User Test Status:** *"I can't see it properly"*
- **Why It Happens & How to Clearly Observe It:**
  - Two things happen on the **Calendar → Balance Sheet** tab:
    1. **Pocket accounts stay collapsed by default:** In `calendar-balance-sheet-tab.tsx` (line 53), `expandedPockets` is supposed to start with all pocket-enabled accounts **expanded** on initial open (`new Set(accountTypes.flatMap(...))`). However, because `isTabLoading` turns `false` **1 frame before** `balanceSheetData` is computed, `CalendarBalanceSheetTab` mounts while `accountTypes` is still empty `[]`—so `expandedPockets` initializes to an empty `Set()`, leaving every pocket account collapsed!
    2. **2-frame flash of `₱0.00` / old day's balance:** During that 1–2 frame gap (~16–32ms) when switching to the **Balance Sheet** tab or tapping a different day on the calendar grid, the top summary ribbon briefly renders `₱0.00` (or the previous day's total) before snapping to the selected day's numbers.
- **Files:**
  - `src/modules/calendar/hooks/use-calendar-data.ts`
  - `src/modules/calendar/components/calendar-balance-sheet-tab.tsx`
- **Before-Fix Scenario (How to Reproduce Easily):**
  1. Make sure at least one account has **Pockets** enabled (with ≥1 pocket).
  2. Open **Calendar**, tap the **Balance Sheet** tab (rightmost tab).
  3. Look at your pocket-enabled account row in the Balance Sheet list.
  4. **Bug Observed:** Its pockets are **collapsed** instead of auto-expanded on open (and if you record screen video or watch the summary header when tapping between two different days on the calendar, the old day's balance flashes under the new date for 1–2 frames).
- **How We Will Properly Fix It:**
  1. In `use-calendar-data.ts`, stop clearing `isTabLoading` in a separate race-prone `scheduleAfterPaint` inside `selectTab` / `toggleSelectDay` / `clearDaySelection`. Instead, compute `balanceSheetData` and clear `isTabLoading` in the **same batched React commit** (per `AGENTS.md` §19.7: *"Synchronized Transition Skeletons"*).
  2. In `calendar-balance-sheet-tab.tsx`, seed `expandedPockets` when `accountTypes` first populates with non-empty data (using a `hasSeededDefaultExpansionRef` ref) so pocket-enabled accounts always auto-expand as intended.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open **Calendar → Balance Sheet** tab with a pocket-enabled account.
  2. **Expected Result:** Pocket-enabled accounts automatically expand to show their pockets on load, and switching days or tabs transitions directly from the skeleton to the exact day's numbers with zero stale/zero flash.

---

### [x] P1-13 — Budgets: Toggling a Budget OFF Drops Displayed Spent to `₱0.00` and Inflates Rollover Target (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/budgets/services/calculate-category-budget.service.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. On **Budgets**, find an active budget that has spending this month (and even better, rollover enabled).
  2. Toggle the switch on that budget card **OFF** (paused).
  3. **Bug Observed:** The card's displayed "Spent" amount immediately drops to `₱0.00` (0%) and if rollover is enabled, the budget target jumps up as if `₱0.00` was spent in the prior period.
- **How We Will Properly Fix It:**
  1. In `calculateBudgetStatusesBatch()` (`calculate-category-budget.service.ts`, line 178), remove `if (!budget.isEnabled) continue;` when collecting category IDs for the batch spending query so paused budgets still display their accurate historical/current spending on the card while excluding them from the active summary totals (`getBudgetSummary` already filters summary totals by `s.isEnabled`).
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Toggle an active budget with spending **OFF** and **ON**.
  2. **Expected Result:** The paused budget card continues to show its real spent amount and accurate rollover target while paused, and the top active-budgets summary correctly excludes it while OFF.

---

### [x] P1-14 — Dashboard: Flashes `"No prior month"` and Collapses Net Worth Chart / Year Pills on Every Focus or Mutation (Implemented — Ready for User Verification)
- **User Test Status:** *"I can't see the difference actually"*
- **Why You Didn't Notice It & How to Trigger It Clearly:**
  - If your Net Worth Trend card on the Dashboard is set to the default **`6M`** filter and you only have transactions in the current year, the chart height stays similar and the 2-frame (~32ms) reset happens very fast.
  - **How to see it unmistakably in 3 seconds:**
    1. Ensure you have at least 1 transaction dated in a **previous month or previous year** (e.g. October 2026 or 2025) so the Dashboard **Net Worth Trend** card shows a percentage badge (like `+12.4% vs last month`) and year pills when you tap **`ALL`**.
    2. On the Dashboard **Net Worth Trend** card, tap the **`ALL`** range filter (and select a year pill if visible).
    3. Now pull down to refresh the Dashboard (or tap `+` to add a transaction, or switch to **Accounts** and back to **Dashboard**).
    4. **Bug Observed:** On every refresh/focus, the Net Worth Trend chart briefly collapses, the year pills disappear and reappear, and the percentage badge flashes `"No prior month"` before popping back!
- **Files:**
  - `src/modules/dashboard/hooks/use-dashboard.ts`
- **How We Will Properly Fix It:**
  1. In `useDashboard` (`use-dashboard.ts`, lines 55–57), when `setSummary(baseSummary)` runs for stage 1 (`includeNetWorthHistory: false`), preserve the previous state's `netWorthHistory` and `netWorthChangePercentage` if already loaded (`prev ? { ...baseSummary, netWorthHistory: prev.netWorthHistory, netWorthChangePercentage: prev.netWorthChangePercentage } : baseSummary`) until stage 2 (`getDashboardNetWorthHistory`) resolves 2 frames later and atomically updates the history.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Select **`ALL`** on the Dashboard Net Worth Trend chart (with multi-month/year data) and pull-to-refresh or add a transaction.
  2. **Expected Result:** The chart, year pills, and percentage badge remain completely steady with zero `"No prior month"` flash or height jump.

---

### [x] P1-15 — Accounts: Accounts with Transaction Presets (and 0 Transactions/Schedules) Hit a Dead-End (Cannot Delete OR Archive) (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (*"It shows delete but after clicking Delete, it says Unable to save account, Cannot permanently delete an account that has transaction history, presets or scheduled transaction, archived it instead"*)
- **Files:**
  - `src/modules/accounts/services/get-accounts-with-balances.service.ts`
  - `src/modules/accounts/services/can-delete-account.service.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Create a new Account with 0 transactions.
  2. Go to **Settings → Transaction Presets** and create a preset using that account.
  3. Go to **Accounts**, tap the account to Edit, and tap the top-right **Trash (Delete)** icon.
  4. **Bug Observed:** It shows the permanent Delete confirmation, and when confirmed, shows: *"Unable to save account: Cannot permanently delete an account that has transaction history, presets, or scheduled transactions. Archive it instead."* — yet the **Archive** button is hidden because `isDeletable` was wrongly computed as `true`!
- **How We Will Properly Fix It:**
  1. In `getAccountIdsInUse()` (`can-delete-account.service.ts`), even when `precomputedTxAccountIds` is passed in by `getAccountsWithBalances()`, always union it with `getAccountIdsWithPresets(context)` and `getAccountIdsWithSchedules(context)` instead of skipping `getAccountIdsWithPresets` when `precomputedTxAccountIds` is provided!
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open Edit Account for the account linked to a Transaction Preset.
  2. **Expected Result:** Because the account is used by a preset, `isDeletable` is `false`, so the modal displays the **Archive Account** button instead of the broken permanent Delete button, allowing you to archive it cleanly (or permanently delete it once the preset is removed).

---

### [x] P1-16 — Fresh Onboarding → Import Accounts: 4 Coupled Issues (Guided Currency Ignored → All Accounts Become PHP, App Kill Skips Seeding, Back Button Traps User, `setupStrategy: "import"` Dropped) (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (*"all accounts become PHP"*)
- **Files:**
  - `src/modules/onboarding/screens/onboarding-screen.tsx`
  - `src/modules/onboarding/services/workspace.service.ts`
  - `src/modules/data-import/screens/data-import-screen.tsx`
  - `src/modules/data-import/hooks/use-data-import.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Reset App Data → start Guided Setup → pick **USD** as your currency → choose **Import accounts** → import a CSV that has no Currency column.
  2. **Bug Observed:**
     - All imported accounts default to **PHP** instead of **USD** (your selected onboarding currency).
     - On the next step (**Notifications**), tapping **Back** returns to an empty file picker with no Continue button unless you re-import.
     - If the app is closed/killed on the Notifications or Ready step before tapping Finish Setup, relaunching sees `hasAccountWorkspaceData() === true` and auto-completes onboarding—skipping default categories, your nickname, and your chosen USD currency!
- **How We Will Properly Fix It:**
  1. Pass `defaultCurrency={currencyCode}` from `OnboardingScreen` into `DataImportScreenContent` / `useDataImport` (and persist the selected currency via `saveDefaultCurrencyCode` when advancing past `GuidedCurrencyStep`) so imported accounts without a currency column use the user's chosen currency (`USD`, `EUR`, etc.) instead of `"PHP"`.
  2. When starting Guided Setup, explicitly persist `onboarding.status = "pending"` in SQLite, and in `readWorkspaceStateFromDatabase()` only run the legacy `if (!status && hasAccountWorkspaceData())` fallback when `status` is completely unset (`undefined`), **not** when `status === "pending"`. That way, force-closing mid-onboarding resumes onboarding instead of skipping category/currency/nickname setup.
  3. On the Guided Setup **Notifications** step after `accountStrategy === "import"` has already completed an import, make **Back** return to `accountChoice` (or show an "Accounts already imported — Continue" state) so the user isn't trapped on a blank file picker.
  4. Add `"import"` to `WorkspaceSetupStrategy` and `parseSetupStrategy()` in `workspace.service.ts`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Reset App Data → Guided Setup → select **USD** → **Import accounts** → import an accounts CSV without a Currency column.
  2. **Expected Result:** Preview and imported accounts all use **USD** (`$`). Tapping Back from Notifications or force-closing before Finish Setup no longer traps the user or skips category/currency seeding.

---

### [x] P1-17 — Currency Upgrade (`v1.7.0 → v1.8.0`): Scrambled Currency Picker Sort Order, Boot Stall (134–155 Unbatched Commits) & Stale Catalog After Restore (Implemented — Ready for User Verification)
- **User Test Status & Decision:** Valid — user explicitly requested to **include `PHP` in pure alphabetical `A → Z` order** (do NOT pin `PHP` first in the list).
- **Files:**
  - `src/modules/currencies/services/seed-currencies.service.ts`
  - `src/modules/currencies/providers/currency-preferences-provider.tsx`
  - `src/modules/onboarding/components/guided-onboarding-steps.tsx`
  - `src/modules/currencies/__tests__/seed-currencies.test.cjs`
- **Before-Fix Scenario (How to Reproduce):**
  1. Open any **Currency Picker** on a database upgraded from v1.7.0 (or after restoring a v1.7.0 backup), or open the Guided Onboarding currency step.
  2. **Bug Observed:** `PHP` was pinned at index 0, followed on upgrades by scrambled currencies (`AED, AUD, AFN, CAD, ALL, CHF...`), seeding ran 134–155 unbatched disk commits on boot, and restoring a v1.7.0 backup did not re-seed/refresh the catalog until app restart.
- **How We Properly Fixed It:**
  1. In `seed-currencies.service.ts`, assign canonical alphabetical `sortOrder = index` (`0..154`, `AED → ZWL`) across all built-in ISO currencies including `PHP`, and normalize any existing built-in rows (`!isCustom`) whose `sortOrder !== index` while leaving custom currencies (`isCustom = true`, `sortOrder = 9000`) untouched.
  2. Wrap all missing inserts and `sortOrder` normalization writes in a single atomic `context.transaction((tx) => ...)` (with a 0-write fast path once already seeded and sorted), eliminating the 134–155 unbatched disk commits boot stall.
  3. In `CurrencyPreferencesProvider`, call `seedCurrenciesIfEmpty()` inside `subscribeToDatabaseReplacement` before `setPreferences(getCurrencyPreferences())` so restoring an older v1.7.0 backup immediately seeds missing currencies, fixes sort order, and refreshes the active currency catalog without requiring an app restart.
  4. In `GuidedCurrencyStep` (`guided-onboarding-steps.tsx`), removed the hardcoded `"PHP"`-first pinning so onboarding currency selection also displays pure alphabetical `A → Z` order.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open any **Currency Picker**, **Currency Catalog**, or **Guided Onboarding Currency Step** (including after upgrading or restoring a v1.7.0 backup).
  2. **Expected Result:** All built-in currencies are sorted strictly `A → Z` (`AED, AFN, ALL, ..., PHP, ..., ZWL`) with `PHP` in its alphabetical position (not pinned first), custom currencies appear after built-ins, and restoring an older backup immediately reflects all 155 currencies without restarting the app.

---

### [x] P1-18 — Quick Sync: Failed Restore Inside `QuickSyncConflictModal` Deadlocks UI in `"syncing"` (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/infrastructure/sync/quick-sync-state.ts`
  - `src/modules/google-drive-backup/services/quick-sync.service.ts`
  - `src/modules/google-drive-backup/__tests__/quick-sync.test.cjs`
- **Before-Fix Scenario (How to Reproduce):**
  1. Trigger `QuickSyncConflictModal`.
  2. Turn on **Airplane Mode** and tap **Restore Quick Sync Data**.
  3. After the error message appears, tap **Decide later**.
  4. **Bug Observed:** The top header sync chip pulses **Syncing...** forever and all Quick Sync buttons remain permanently disabled.
- **How We Properly Fix It:**
  1. In `setQuickSyncRemoteConflict()` (`quick-sync-state.ts`), reset `currentStatus = "idle"` whenever `currentStatus === "syncing"` and a non-null conflict is recorded, and accept an optional `errorMessage` option so state transitions happen in a single atomic `notifySubscribers()` broadcast.
  2. In `resolveQuickSyncConflictByRestore()` (`quick-sync.service.ts`), pass `errorMessage: message` into `setQuickSyncRemoteConflict(conflict, { openPrompt: true, errorMessage: message })` inside the `catch` block so `getQuickSyncState()` immediately returns `status: "remote_ahead"` instead of staying stuck in `"syncing"`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Repeat the exact Airplane Mode conflict restore failure and tap **Decide later**.
  2. **Expected Result:** The header chip immediately displays **Update available** (`remote_ahead`) instead of being stuck in **Syncing...**, Quick Sync controls remain responsive, and tapping the chip reopens the conflict modal.

---

### [x] P1-19 — Quick Sync: Restoring Local Backup or Manual Google Drive Backup Leaves Stale Baseline & Overwrites Drive Quick Sync (Implemented — Ready for User Verification)
- **User Test Status:** *"I can't verify this properly"*
- **Why It Was Hard to Verify & Exact Step-by-Step Scenario:**
  - When you restore a **Local Backup (`.kfb`)** or a **Manual Google Drive Backup**, the SQLite database is replaced with an older snapshot, **but** `quick-sync-device.json` on disk keeps the `lastKnownRemoteSyncId` from *before* the restore!
  - Because `quick-sync-device.json` still says *"I already have the latest cloud revision `rev-10`"*, Quick Sync thinks your newly restored older database is up to date with `rev-10`—and as soon as you add or edit 1 transaction (or 1.5s after restoring a manual Google Drive backup), Quick Sync uploads the old backup over your newer cloud Quick Sync file!
- **Files:**
  - `src/infrastructure/database/snapshot.ts`
  - `src/infrastructure/sync/quick-sync-device.storage.ts`
  - `src/infrastructure/sync/index.ts`
  - `src/modules/local-backup/services/restore-local-backup.service.ts`
  - `src/modules/google-drive-backup/services/restore-google-drive-backup.service.ts`
  - `src/modules/google-drive-backup/__tests__/quick-sync.test.cjs`
- **Before-Fix Scenario (How to Reproduce Step-by-Step):**
  1. Start with **2 transactions** in the app (with Quick Sync ON, or enable Quick Sync in step 2). Go to **Settings → Local Backup → Create Backup** (this saves a 2-transaction `.kfb` file).
  2. Enable **Quick Sync** (if not already on), add **3 more transactions** (total = **5 transactions**), and tap **Sync Now** so Google Drive Quick Sync has **5 transactions**.
  3. Now go to **Settings → Local Backup → Restore Backup** and select the older **2-transaction** `.kfb` file (or restore an older Manual Google Drive Backup).
  4. After the app reloads with 2 transactions (re-enabling Quick Sync if it was OFF in that older backup), wait 2 seconds or edit/add 1 transaction.
  5. **Bug Observed:** Quick Sync did **not** warn that Google Drive has a different 5-transaction backup—it silently overwrote Google Drive Quick Sync with your restored database!
- **How We Properly Fix It:**
  1. Added `clearQuickSyncRemoteBaselineOnManualRestore()` in `quick-sync-device.storage.ts` (exported via `@/infrastructure/sync`) to clear `lastKnownRemoteSyncId`, `lastKnownRemoteHeadRevisionId`, `lastKnownRemoteVersion`, `lastKnownRemoteModifiedTime`, and `lastKnownRemoteFileId` while preserving `deviceId`/`customDeviceName` and setting `hasUnsyncedLocalChanges: true`.
  2. Made `setDatabaseReplacing()` in `snapshot.ts` re-entrant via a depth counter (`replacingDepth`) so outer restore services stay protected across `replaceDatabaseFromSnapshot`, `finalizeRestoredWorkspace`, and Quick Sync config updates.
  3. In both `restoreLocalBackup()` and `restoreGoogleDriveBackup()`, wrapped the restore + finalization block in `setDatabaseReplacing(true)` / `finally { setDatabaseReplacing(false) }`, cancelled pending debounced Quick Sync timers, cleared stale `lastSyncedAt: null` in the restored DB's Quick Sync config (blocking `adopt_self` even when the same phone uploaded the cloud Quick Sync file), cleared any stale conflict, and called `clearQuickSyncRemoteBaselineOnManualRestore()`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Follow the steps above (sync 5 transactions to Quick Sync → restore the older 2-transaction Local Backup or Manual Google Drive Backup).
  2. **Expected Result:** Quick Sync detects the mismatch against the cloud Quick Sync file and shows the **Quick Sync Conflict Modal** (with *"This device has unsynced local changes"*) instead of silently overwriting Drive. Only explicitly tapping **Overwrite Drive Data** pushes the restored backup to Quick Sync.

---

### [x] P1-20 — Quick Sync: Trashed Drive File Loops Forever + Non-ASCII/Emoji Device Labels Fail with HTTP 400 + `resetAppData` Re-Dirties Pending Changes (Implemented — Ready for User Verification)
- **User Test Status:** *"Can't verify this properly"*
- **How to Reproduce Easily (Without Needing Google Drive Web):**
  - You can verify the **Device Label HTTP 400 failure** directly inside the app in 15 seconds:
    1. Go to **Settings → Google Drive Backup** (with Quick Sync ON).
    2. In the **Device label** input field, paste 25 emojis (for example: `📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱📱`) and tap **Save**.
    3. Now tap **Sync Now**.
    4. **Bug Observed:** Sync fails with an error because Google Drive's `appProperties` enforces a strict **124-byte UTF-8 limit** for `key + value` (`"lastUpdatedByDeviceName"` is 23 bytes + 25 emojis × 4 UTF-8 bytes = 123+ bytes > 124 bytes), whereas the app only sliced `.slice(0, 60)` by JavaScript characters!
  - And for the **Trashed Drive file loop**: If a user deletes `kaizen-finance-quick-sync.kfb` into Google Drive's Trash bin on drive.google.com, `getGoogleDriveQuickSyncFileMetadata()` filters `trashed = false` (returning `null`), but `uploadOrUpdateGoogleDriveQuickSyncBackup()` still reused `existingFileId` and sent an HTTP `PATCH` to the trashed file—which succeeds with `200 OK` while keeping the file inside Google Drive Trash forever!
- **Files:**
  - `src/infrastructure/sync/adapters/google-drive-backup.adapter.ts`
  - `src/modules/google-drive-backup/services/quick-sync.service.ts`
  - `src/modules/settings/services/reset-app-data.service.ts` (already guarded with `setDatabaseReplacing(true)` / `finally { setDatabaseReplacing(false) }` + `cancelDebouncedQuickSync()` + `clearQuickSyncRemoteTracking()`)
  - `src/modules/google-drive-backup/__tests__/quick-sync.test.cjs`
- **How We Properly Fix It:**
  1. **UTF-8 Byte Truncation Helper:** Added `truncateUtf8Bytes(value, maxBytes)` (code-point safe, never splitting UTF-16 surrogate pairs) and `fitDriveAppPropertyValue(key, rawValue)` in `google-drive-backup.adapter.ts` capping Quick Sync `appProperties` values to `Math.min(80, 124 - utf8Bytes(key))` so `key + value` never exceeds Google Drive's 124-byte UTF-8 limit even for 4-byte emojis or 3-byte CJK characters.
  2. **Trashed File Recovery (Defense-in-Depth):**
     - In `performSync()` (`quick-sync.service.ts`), clear `targetFileId = null` whenever the pre-upload remote check evaluates `status === "missing"` (and adopt `evaluation.remoteFile.id` on `up_to_date` / `adopt_self`) so stale/trashed IDs are not `PATCH`ed.
     - In `uploadOrUpdateGoogleDriveQuickSyncBackup()` (`google-drive-backup.adapter.ts`), check `if (!updated.trashed)` before returning a `PATCH` response (and require `!file.trashed` in the folder scan), falling through to create a fresh active Drive file if a trashed file ID was `PATCH`ed (including during `forceOverwrite: true`).
  3. **`resetAppData` Guard:** Verified `resetAppData()` wraps DB deletion in `setDatabaseReplacing(true)` / `finally { setDatabaseReplacing(false) }`, cancels debounced Quick Sync, and clears remote tracking (`P1-01`).
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Paste 25 emojis into **Device label**, tap **Save**, and tap **Sync Now**.
  2. **Expected Result:** Sync succeeds (`Synced`) with zero HTTP 400 error.
  3. (Optional) Move `kaizen-finance-quick-sync.kfb` to Trash on drive.google.com and tap **Sync Now** — Quick Sync creates a fresh active `kaizen-finance-quick-sync.kfb` in `Kaizen Finance/Backups` instead of looping on the trashed file.

---

### [x] P1-21 — Chat with Kai: "Manage Kai Knowledge" Doesn't Close Modal + `chat-keywords-cache` Missing Invalidation on Deletions (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/chat-with-kai/components/chat-with-kai-modal.tsx`
  - `src/modules/chat-with-kai/hooks/use-chat-with-kai.ts`
  - `src/modules/chat-with-kai/utils/chat-keywords-cache.ts`
  - `src/modules/chat-with-kai/index.ts`
  - `src/modules/accounts/services/delete-account.service.ts`
  - `src/modules/categories/services/delete-category.service.ts`
  - `src/modules/categories/services/category-presets.service.ts`
  - `src/modules/chat-with-kai/__tests__/parse-chat-transaction.test.cjs`
- **Before-Fix Scenario (How to Reproduce):**
  1. Open **Chat with Kai** → tap the gear icon (Settings) → tap **Manage Kai Knowledge**.
  2. Add a custom keyword (e.g. `"boba"` under Food & Dining), then press Back to return to Chat with Kai.
  3. Type `"boba 150"`.
  4. **Bug Observed:** Kai does not recognize `"boba"` until you completely close and reopen Chat with Kai (and on iOS, the Kai Knowledge screen opens *behind* the still-open Kai modal).
- **How We Properly Fix It:**
  1. In `chat-with-kai-modal.tsx`, call `onClose()` before `router.push("/kai-knowledge")` so the modal dismisses cleanly before navigating to the Kai Knowledge screen.
  2. In `chat-keywords-cache.ts`, added a monotonic `cacheVersion` counter and `subscribeChatKeywordsCacheInvalidation()` listener registry notified on every `invalidateChatKeywordsCache()`, and exported `invalidateChatKeywordsCache` through `@/modules/chat-with-kai` (`deferFunction`).
  3. In `use-chat-with-kai.ts`, subscribed to cache invalidation so mounted Kai instances immediately reload fresh keywords, avoided caching empty maps while `context.categories.length === 0`, and guarded writes with `requestVersion` so stale in-flight loads never overwrite a newer invalidation.
  4. Called `invalidateChatKeywordsCache()` after committed transactions in `deleteAccount`, `deleteCategory`, `deleteCategoryPresets`, and `loadCategoryPresets`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open **Chat with Kai** → Settings → **Manage Kai Knowledge** → Kai modal closes cleanly and navigates to Kai Knowledge.
  2. Add keyword `"boba"` → return and reopen Kai, then type `"boba 150"` → immediately matches the category without stale keywords (and deleting an account/category/preset clears stale cached keywords).

---

### [x] P1-22 — Accounts CSV Share Deletes Cache File Too Early on Android + iOS `subscriptions` Ad Fallback Uses Android Unit ID (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (*"it's said Couldn't attach file"*)
- **Files:**
  - `src/modules/accounts/services/export-accounts-csv.service.ts`
  - `src/modules/ads/constants/ads.constants.ts`
  - `src/modules/accounts/__tests__/accounts-csv.test.cjs`
- **Before-Fix Scenario (How to Reproduce):**
  1. On Android, go to **Accounts** → tap **Export CSV** → choose **Share** → pick Gmail, Google Drive, or WhatsApp.
  2. **Bug Observed:** Target app shows *"Couldn't attach file"* (or 0-byte attachment) because `shareAccountsCsv()` deletes the temporary file in `finally` before the receiving Android app finishes reading the file URI.
- **How We Properly Fix It:**
  1. In `shareAccountsCsv()` (`export-accounts-csv.service.ts`), removed the immediate `finally { file.delete() }` deletion so the shared `.csv` stays intact in `Paths.cache/accounts-csv-exports` while Android receiving apps read the URI (also passing `UTI: "public.comma-separated-values-text"`), and added best-effort `cleanupStaleCsvCacheFiles()` to prune `.csv` cache files older than 15 minutes on subsequent exports.
  2. In `ads.constants.ts`, updated `getIosPlacementUnitId("subscriptions")` to return `process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_SUBSCRIPTIONS` (removing the Android fallback) so `getBannerAdUnitId()` falls back cleanly to `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS` → `TestIds.BANNER`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. On Android, go to **Accounts → Export CSV → Share** and pick Gmail or Google Drive.
  2. **Expected Result:** The `.csv` file attaches and uploads cleanly with all account rows intact.

---

## Medium / Low Severity (Part 1)

### [x] P1-23 — Quick Sync: `restoreQuickSyncBackup` / Conflict Restore Doesn't Hold `activeSyncPromise` (Implemented — Ready for User Verification)
- **User Test Status & Question:** *"I can't validate, but how can we resolve it"*
- **Why It Happens & How We Resolve It Cleanly:**
  - `performSync()` (uploading) uses `activeSyncPromise` as a mutex lock so two uploads can't run at the same time.
  - However, `restoreQuickSyncBackup()` and `resolveQuickSyncConflictByRestore()` (downloading & replacing the local SQLite database) did **not** hold `activeSyncPromise` or cancel pending debounce timers.
  - If a 3-second debounce timer or an `AppState` resume check fired while a restore download was mid-flight, `performSync()` or `checkQuickSyncRemoteStatus()` could run concurrently against the database while it was being replaced.
- **Files:**
  - `src/modules/google-drive-backup/services/quick-sync.service.ts`
  - `src/modules/google-drive-backup/hooks/use-quick-sync.ts`
  - `src/modules/google-drive-backup/hooks/use-google-drive-backup.ts`
  - `src/modules/google-drive-backup/__tests__/quick-sync.test.cjs`
- **How We Properly Fix It:**
  1. Added a coordinated `runCoordinatedQuickSyncRestore()` + `restoreFromQuickSync()` mutex in `quick-sync.service.ts` shared by both `restoreFromQuickSync` and `resolveQuickSyncConflictByRestore`: immediately cancels pending debounced Quick Sync timers (`cancelDebouncedQuickSync()`), sets `isRestoringQuickSync = true`, awaits any in-flight `activeSyncPromise` upload before starting restore, holds `activeSyncPromise` for the full restore duration, and deduplicates overlapping restore calls via `activeRestorePromise`.
  2. Guarded `triggerQuickSync()` (`return false`) and `checkQuickSyncRemoteStatus()` (`return "skipped"`) when `isRestoringQuickSync` is `true`, preventing any upload or remote check from slipping in during restore or during the microtask handoff after a prior upload settles.
  3. Routed `useQuickSync().restoreFromQuickSync` and `useGoogleDriveBackup().restoreQuickSync` through `restoreFromQuickSync()` in `quick-sync.service.ts` so every Quick Sync restore path holds the mutex.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Automated test in `src/modules/google-drive-backup/__tests__/quick-sync.test.cjs` (`quick sync restore mutex (P1-23)`) verifies both directions: (A) a queued debounced edit is cancelled and concurrent `triggerQuickSync` / `checkQuickSyncRemoteStatus` calls no-op/skip during restore, and (B) a restore started while an upload is mid-flight waits until the upload finishes before executing.

---

### [x] P1-24 — Quick Sync: Device Label Sanitization Mismatch (`"My  Phone"` Double Space) Leaves Save Button Stuck Active (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/google-drive-backup/components/quick-sync-card.tsx`
  - `src/modules/google-drive-backup/__tests__/quick-sync.test.cjs`
- **Before-Fix Scenario (How to Reproduce):**
  1. In **Google Drive Backup → Quick Sync**, save device label as `"My Phone"`.
  2. Edit the input to `"My  Phone"` (two spaces) and tap **Save**.
  3. **Bug Observed:** Save button stays enabled and shows *"Device label saved"* on every tap because `isDeviceLabelDirty` compared raw trimmed text (`"My  Phone"`) against sanitized stored text (`"My Phone"`), and didn't normalize the local input state to the saved sanitized value.
- **How We Properly Fix It:**
  1. In `quick-sync-card.tsx`, computed `sanitizedDraft = sanitizeQuickSyncCustomDeviceName(deviceLabelDraft) ?? ""` using the exact same sanitizer as storage, compared `sanitizedDraft !== savedCustomLabel` for `isDeviceLabelDirty`, and normalized `setDeviceLabelDraft(sanitizedDraft)` on save.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Save `"My Phone"`, then type `"My  Phone"` (double space).
  2. **Expected Result:** The Save button recognizes it normalizes to `"My Phone"` and stays disabled; saving a new label with multiple spaces (e.g. `"Work  Phone"`) immediately collapses the input to `"Work Phone"` and disables the Save button.

---

### [x] P1-25 — Quick Sync: Android `NetInfo` Double-Fire Cancels `force: true` Reconnect Check Behind 12s Cooldown (Implemented — Ready for User Verification)
- **User Test Status:** *"Can't verify it properly"*
- **Why It Happens & How to Verify:**
  - In `quick-sync-processor.tsx`, when Android reconnects to Wi-Fi, `NetInfo.addEventListener` often fires **twice** within 100ms (once when `isConnected` becomes `true`, and 50ms later when `isInternetReachable` becomes `true`).
  - Event #1 saw `wasDisconnected === true` and scheduled a 1.5s timer with **`force: true`** (to bypass the 12-second cooldown).
  - 50ms later, Event #2 saw `wasDisconnected === false`, **cancelled Event #1's timer**, and replaced it with **`force: false`**!
  - If you had synced less than 12 seconds earlier, `force: false` hit the 12-second cooldown and skipped the reconnect sync!
- **Files:**
  - `src/modules/google-drive-backup/components/quick-sync-processor.tsx`
  - `src/modules/google-drive-backup/__tests__/quick-sync.test.cjs`
- **Before-Fix Scenario (How to Reproduce in 10 Seconds):**
  1. With Quick Sync ON, tap **Sync Now** (this sets `lastRemoteCheckCompletedAt = now`).
  2. Immediately turn **Airplane Mode ON**, add 1 transaction, and turn **Airplane Mode OFF** within **8 seconds** of step 1.
  3. Watch the Quick Sync status chip after Wi-Fi reconnects.
  4. **Bug Observed:** Because less than 12 seconds elapsed since Step 1 and the second `NetInfo` event downgraded `force: true` to `force: false`, the reconnect check was skipped by the 12-second cooldown!
- **How We Properly Fix It:**
  1. Added `pendingScheduledCheck` and `mergeDeferredQuickSyncCheck()` in `quick-sync-processor.tsx` so any coalesced `scheduleDeferredRemoteCheck()` call preserves `force: existing.force || incoming.force` and `requireNetworkMatch: existing.requireNetworkMatch && incoming.requireNetworkMatch` until the timer actually fires (and also preserves `force: true` if the app locks while the timer is pending).
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Tap **Sync Now** → toggle Airplane Mode ON → add 1 transaction → toggle Airplane Mode OFF within 8 seconds.
  2. **Expected Result:** ~1.5 seconds after Wi-Fi reconnects, Quick Sync automatically bypasses the 12-second cooldown and uploads the offline transaction.

---

### [x] P1-26 — Transactions: Amount-Sort Pagination Auto-Scrolls / Jumps Rows Into Earlier Date Headers on Page 2 (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (*"it auto scroll going up"*)
- **Why It Auto-Scrolled Up When You Reached Page 2:**
  - `TransactionsScreen` renders a `<SectionList>` grouped by **Date**.
  - When sorting by **Amount (High → Low)**, Page 1 loads the 50 largest transactions across various dates (e.g., Nov 18 has a `₱50,000` item at the very top of the list).
  - When you scroll down past item 50, Page 2 loads smaller transactions (e.g., a `₱200` item that ALSO happened on Nov 18).
  - Because `groupedTransactions` merged all items with the same date (`2026-11-18`) into the **existing Nov 18 section at the top of Page 1**, inserting new rows above your current scroll position caused React Native's `<SectionList>` to shift/auto-scroll upward and broke the global Amount sort order!
- **Files:**
  - `src/modules/transactions/utils/group-transactions-sections.ts`
  - `src/modules/transactions/screens/transactions-screen.tsx`
  - `src/modules/transactions/__tests__/paginated-transactions.test.cjs`
- **Before-Fix Scenario (How to Reproduce):**
  1. On **Transactions** with >50 transactions, change Sort to **Amount: High to Low** (or **Low to High**).
  2. Scroll down past the 50th transaction to load Page 2.
  3. **Bug Observed:** Newly loaded Page 2 rows are inserted into earlier date sections at the top of the list, causing the scroll position to jump/auto-scroll upward and placing smaller amounts above larger amounts.
- **How We Properly Fix It:**
  1. Extracted `buildTransactionSections(transactions, sortBy, defaultCurrency)` in `src/modules/transactions/utils/group-transactions-sections.ts` and used it directly in `transactions-screen.tsx`:
     - When `sortBy === "date"`, preserves calendar-day grouped sections with daily net totals and record counts (`isFlat: false`).
     - When `sortBy === "amount"`, returns a single flat section (`isFlat: true`) in exact SQLite amount order (each `TransactionRow` already displays its own full date & time) and skips rendering date group headers (`if (section.isFlat) return null`), so Page 2+ items strictly append below Page 1 with zero upward scroll jump.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Sort Transactions by **Amount: High to Low** on >50 transactions and scroll through Page 1 → Page 2 → Page 3.
  2. **Expected Result:** Every single row stays strictly in descending amount order from top to bottom, and loading Page 2 never causes the list to auto-scroll upward.

---

### [x] P1-27 — Transactions: Unchecking All Labels While Editing + Creating/Editing Any Label in Picker Reverts Removed Labels (Implemented — Ready for User Verification)
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/transactions/components/transaction-form-modal.tsx`
- **Before-Fix Scenario (How to Reproduce):**
  1. Edit an existing transaction that has at least 1 label attached.
  2. Open the Label Picker, **uncheck all labels** (so `selectedLabelIds` is now `[]`), then tap **+ New Label** inside the picker (or edit a label name) and close the picker.
  3. **Bug Observed:** The old label you just unchecked comes right back! (Because the fallback hydration `useEffect` checked `if (current.length > 0) return current` whenever `labels` refreshed and re-seeded `initialTransaction.labels`!).
- **How We Properly Fix It:**
  1. In `TransactionFormModalContent`, added `hasInitializedLabelsRef` (set to `true` once labels are initialized for the form session or manually modified via the picker or chip remove button, and reset when `!visible`). The async fallback hydration `useEffect` now runs at most once when `labels` first loads after opening, so intentionally clearing all labels to `[]` is never overwritten when `refreshLabels()` runs after creating/editing a label in `LabelPickerModal`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Repeat the exact scenario above.
  2. **Expected Result:** Unchecked labels stay unchecked after creating or editing a label in the picker and closing it.

---

### [ ] P1-28 — Calendar: Scroll Pagination Bursts Multiple Pages in One Flick & Re-Tapping Active Tab Flashes Skeleton
- **User Test Status:** *"Can't verify it properly"*
- **How to Verify Easily (Two Simple Checks):**
  1. **Check A (Re-tapping active tab flashes skeleton):**
     - Open **Calendar**. You are already on the **Transactions** tab (the first tab below the calendar grid).
     - Tap the **Transactions** tab button again (even though it is already selected).
     - **Bug Observed:** The tab content flashes a loading skeleton for 2 frames every time you tap the already-active tab! (And tapping the already-active **Schedules**, **Net**, or **Balance Sheet** tab does the same thing).
  2. **Check B (Scroll pagination burst):**
     - On a month with >120 transactions, flick-scroll to the bottom of the Calendar Transactions list: `handleScroll` fires on every 16ms scroll frame without an in-flight guard, incrementing `visibleTxCount` from `50 → 100 → 150 → 200` all in a single flick.
- **Files:**
  - `src/modules/calendar/hooks/use-calendar-data.ts`
  - `src/modules/calendar/screens/calendar-screen.tsx`
- **How We Will Properly Fix It:**
  1. In `selectTab` (`use-calendar-data.ts`, line 606), return early if `tab === activeTab` (`setActiveTab((prev) => { if (prev === tab) return prev; ... })`) so tapping the already-selected tab is a no-op and never flashes the skeleton.
  2. In `calendar-screen.tsx` (`handleScroll`, line 295), add a `loadingMoreScrollRef` guard reset on content size change so one bottom reach only advances `visibleTxCount` by one page (`+50`) at a time.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Tap the currently active tab on **Calendar** (**Transactions**, **Schedules**, **Net**, or **Balance Sheet**).
  2. **Expected Result:** Zero skeleton flash when tapping an already-active tab.

---

### [ ] P1-29 — Budgets: Brief Flash of `"0 active categories"` / `"No all budgets configured."` on Initial Load
- **User Test Status:** *"Can't verify it properly"*
- **Why It Happens & How to See It:**
  - In `use-budgets.ts` (line 48), `loading` initializes to `false` (`useState(false)`), and `refresh()` waits 2 animation frames (`runDeferredSyncQuery`) before setting `loading = true`!
  - So for the first 2 frames (~32ms) when navigating to **Budgets** for the very first time after launching the app, `loading` is `false` and `statuses` is `[]`—rendering the empty state (`"No budgets configured"` / `"0 active categories"`) before the skeleton/cards appear.
- **Files:**
  - `src/modules/budgets/hooks/use-budgets.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Have at least 1 budget configured. Force-close and reopen the app.
  2. Navigate to **Budgets** for the first time and watch the center of the screen closely as it opens.
  3. **Bug Observed:** For 1–2 frames before the budget cards appear, the empty-state card briefly flashes.
- **How We Will Properly Fix It:**
  1. In `useBudgets` (`use-budgets.ts`, line 48), initialize `const [loading, setLoading] = useState(true);` so frame 1 renders the native-driven skeleton loader cleanly until the deferred SQLite query commits `statuses`, `summary`, and `loading = false` in a single batch.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Force-close, relaunch, and open **Budgets**.
  2. **Expected Result:** Transitions smoothly from skeleton to your budget cards with zero empty-state flash.

---

### [ ] P1-30 — Dashboard: Deleting a Transaction in Kai on Dashboard Leaves `accounts` Balances Stale in `TransactionFormModal`
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/dashboard/screens/dashboard-screen.tsx`
- **Before-Fix Scenario (How to Reproduce):**
  1. On **Dashboard**, open **Chat with Kai**, save a transaction (or delete a saved transaction inside Kai), and close Kai.
  2. Still on **Dashboard**, tap `+` to open **New Transaction** and tap the **Account** field to open the Account Picker.
  3. **Bug Observed:** The account balance shown inside the Account Picker still shows the old balance before the Kai deletion!
- **How We Will Properly Fix It:**
  1. In `DashboardScreen` (`dashboard-screen.tsx`, line 310), update the `FINANCE_APP_TRANSACTION_MUTATED` listener to call **both** `refreshDashboard()` **and** `refreshAccounts()`, and pass `sourceId` self-echo guarding so manual saves on Dashboard don't double-call `refreshDashboard()`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. On **Dashboard**, delete or save a transaction via **Chat with Kai**, close Kai, and open **New Transaction → Account Picker**.
  2. **Expected Result:** The Account Picker immediately shows the updated account balance.

---

### [ ] P1-31 — Accounts Export: CSV Export Includes Archived Accounts & Ignores Active Search Filter
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/accounts/screens/accounts-screen.tsx`
- **Before-Fix Scenario (How to Reproduce):**
  1. Archive an account (e.g. `"Old Wallet"`).
  2. On **Accounts** (with Archived hidden), type `"Old Wallet"` in the search bar → screen shows *"No matching accounts"*.
  3. Tap **Export CSV** in the header.
  4. **Bug Observed:** It exports `"Old Wallet"` anyway because `exportableAccounts` filters `data.accounts` (which includes archived accounts) instead of `filteredActive`!
- **How We Will Properly Fix It:**
  1. In `AccountsScreen` (`accounts-screen.tsx`, line 197), derive `exportableAccounts` from `filteredActive` (and only include `filteredArchived` when `showArchived` is actually toggled ON, or keep export scoped to the visible active accounts).
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Search for an archived account while Archived is collapsed/hidden → screen shows *"No matching accounts"* and tapping Export CSV shows the *"No accounts to export"* notice instead of secretly exporting hidden archived accounts.

---

### [ ] P1-32 — Data Import: *"Fill from a column in your file"* Silently Does Nothing for New Credit Cards Appearing Only in `To Account`
- **User Test Status:** *"Can't verify properly"*
- **Why It Happens & Exact CSV to Verify It:**
  - When importing a **Transactions CSV**, a new Credit Card account might only appear in the **`To Account`** column (for example, a CSV containing a credit card bill payment: `Type: Transfer, Account: BDO Savings, To Account: BPI Credit Card, Amount: 5000`).
  - During the **Match Accounts** step, `"BPI Credit Card"` is detected as a new account. When you change its Account Type to **Credit Card**, the form asks for **Credit Limit**, **Statement Day**, and **Payment Due Day**, and offers **"Fill from a column in your file"**.
  - However, `fillAccountDetailFromColumn()` (`import-matching-cards.tsx`, line 46) only checks `if (normalizeImportName(accountName) !== accountKey) continue;` against the **`Account`** column—it never checks the **`To Account`** column! So picking a column does nothing at all!
- **Files:**
  - `src/modules/data-import/components/import-matching-cards.tsx`
- **Before-Fix Scenario (How to Reproduce Step-by-Step):**
  1. Create a 1-row Transactions CSV file:
     ```csv
     Date,Type,Account,To Account,Amount,Credit Limit,Statement Day,Due Day
     2026-11-15,Transfer,Cash,My New Visa Card,1500,50000,15,5
     ```
  2. Go to **Settings → Data Import → Import Transactions** and pick that CSV.
  3. On the **Accounts** matching step, find **`My New Visa Card`**, change its type to **Credit Card**, tap **Fill from a column in your file**, and select `Credit Limit`, `Statement Day`, or `Due Day`.
  4. **Bug Observed:** Nothing is filled into the fields!
- **How We Will Properly Fix It:**
  1. In `fillAccountDetailFromColumn()` (`import-matching-cards.tsx`, lines 41–54), check if `accountKey` matches **either** the row's `account` cell **or** (when the row is a transfer) the row's `toAccount` cell.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Repeat the 3 steps above with the 1-row Transfer CSV.
  2. **Expected Result:** Selecting `Credit Limit`, `Statement Day`, and `Due Day` from *"Fill from a column in your file"* immediately populates `50000`, `15`, and `5` for `My New Visa Card`.

---

### [ ] P1-33 — Walkthrough: Accounts Tour Shows Solid Dark Backdrop When Search Hides Sections; Transactions Tour `txFirstItem` Scrolls to Top Instead of Row
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/accounts/screens/accounts-screen.tsx`
  - `src/modules/transactions/screens/transactions-screen.tsx`
- **Before-Fix Scenario (How to Reproduce):**
  1. On **Accounts**, type a search query that matches only 1 Asset account (hiding Liabilities), then tap the `?` walkthrough button and step through the tour → when it reaches the missing section step, the spotlight disappears leaving a solid dark backdrop.
  2. On **Transactions** on a smaller screen, tap `?` to start the tour → when advancing from the Filter Panel step to **First Transaction Row**, it scrolls to `y: 0` (top header) instead of scrolling the first transaction row into view.
- **How We Will Properly Fix It:**
  1. In `AccountsScreen`, clear the active search query (`setSearchQuery("")`) and expand collapsed groups when starting the walkthrough so all tour target sections are mounted and visible (or dynamically filter walkthrough steps to only mounted target keys).
  2. In `TransactionsScreen`, measure or scroll to the first transaction row (`scrollToLocation({ sectionIndex: 0, itemIndex: 0 })`) when entering the `txFirstItem` walkthrough step instead of scrolling to `offset: 0`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Start the Accounts walkthrough while searching/collapsed → search clears and every step highlights its target cleanly.
  2. Start the Transactions walkthrough → `txFirstItem` scrolls the actual first transaction row into the spotlight.

---

### [ ] P1-34 — Chat with Kai: Stale Proposals After Account/Category Delete, Missing `defaultCurrency` on Transactions Screen & Missing Edit Badges in Global Host
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/chat-with-kai/components/chat-with-kai-modal.tsx`
  - `src/modules/transactions/screens/transactions-screen.tsx`
  - `src/modules/gestures/components/global-quick-entry-host.tsx`
- **Before-Fix Scenario (How to Reproduce):**
  1. Set Default Currency to **USD (`$`)**, go to **Transactions**, open **Chat with Kai**, and type `"coffee 5 or 10"` → the ambiguity chips show `₱5.00` / `₱10.00` instead of `$5.00` / `$10.00` because `TransactionsScreen` forgot to pass `defaultCurrency={defaultCurrency}` to `<ChatWithKaiModal>`.
  2. Draft a Kai proposal (do not save yet), close Kai, delete the account or category used by that proposal, reopen Kai, and tap **Save** → fails silently with no user feedback.
- **How We Will Properly Fix It:**
  1. Pass `defaultCurrency={defaultCurrency}` to `<ChatWithKaiModal>` in `transactions-screen.tsx`.
  2. In `chat-with-kai-modal.tsx` (`handleSave`), validate that the proposal's `accountId`, `toAccountId`, and `categoryId` still exist in active `accounts`/`categories` (or catch the error from `onConfirmSave` and show an actionable error message / fallback instead of failing silently).
  3. In `global-quick-entry-host.tsx`, include `pocketName` and `currencyCode` when updating a saved Kai proposal after editing.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Set Default Currency to **USD**, open Kai on **Transactions**, type `"coffee 5 or 10"` → chips display `$5.00` and `$10.00`.
  2. Delete an account referenced by an unsaved Kai proposal, reopen Kai, and tap **Save** → displays a clear validation message or falls back gracefully instead of silently doing nothing.

---

### [ ] P1-35 — Ads / Layout: `AnchoredAdDock` Causes Layout Jump on Every Tab Focus & Renders Behind/Under Active Keyboard on Search Screens
- **User Test Status & Question:** *"Keyboard covers the ads, it didn't go above the keyboard, or my verification is wrong?"*
- **Why Your Verification Is Right (Android 15 Edge-to-Edge vs Focus Layout Jump):**
  - Your observation on Android is completely accurate! Here is why:
    1. On modern Android (Android 15 / Edge-to-Edge), the OS slides the software keyboard *over* the bottom of the screen (covering `AnchoredAdDock`), whereas on older Android devices without edge-to-edge, `windowSoftInputMode="adjustResize"` shrinks the window height and pushes `AnchoredAdDock` (plus the FAB sitting above it) right on top of the keyboard!
    2. Even when the keyboard covers the ad on Android 15, keeping the ad mounted and active while the keyboard is open wastes layout height (especially if the screen shifts or uses `KeyboardAvoidingView`), **and more importantly**, look at lines 36–42 of `anchored-ad-dock.tsx`:
       ```ts
       useFocusEffect(
         useCallback(() => {
           return () => {
             setIsLoaded(false);
           };
         }, []),
       );
       ```
       Every single time you navigate away from Dashboard/Transactions/Accounts and come back, `setIsLoaded(false)` collapses the dock height to `0px`, and ~200–400ms after returning to the screen, `onAdLoaded` sets `setIsLoaded(true)` (`~65px`), causing the floating action buttons (Kai FAB / `+` FAB) and bottom content to **jump upward by 65px on every screen switch**!
- **Files:**
  - `src/modules/ads/components/anchored-ad-dock.tsx`
- **Before-Fix Scenario (How to Reproduce the Layout Jump):**
  1. As a Free user (online so banner ads load), open **Dashboard** or **Transactions** and wait 1 second for the bottom `SPONSORED` banner ad to appear.
  2. Switch to **Accounts** (or open any detail screen) and switch back to **Dashboard** / **Transactions** while watching the bottom-right **Kai / `+` floating buttons**.
  3. **Bug Observed:** Every time you return to the screen, the dock collapses to `0px` and then pops back up ~300ms later, making the floating action buttons jump up and down on every navigation!
- **How We Will Properly Fix It:**
  1. In `AnchoredAdDock` (`anchored-ad-dock.tsx`), remember the last resolved height/loaded state across focus transitions (or reserve the last measured dock height once an ad has succeeded during the session, collapsing only if `onAdFailedToLoad` fires or the user upgrades to Pro) so switching between screens never causes a 65px vertical jump on focus.
  2. Hide/collapse `AnchoredAdDock` while the software keyboard is open (`Keyboard.addListener("keyboardDidShow" / "keyboardDidHide")`) so across **all** Android versions (both older `adjustResize` devices and newer edge-to-edge devices), the ad banner never stacks above the keyboard or steals viewport space while typing.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Switch back and forth between **Dashboard**, **Transactions**, and **Accounts** with ads loaded.
  2. **Expected Result:** The bottom ad dock and floating action buttons stay at a stable height without jumping on every screen focus, and opening the keyboard cleanly hides the ad dock until the keyboard closes.

---

### [ ] P1-36 — Widgets: `WidgetSyncProcessor` Omits `budget_monthly_targets`, Leaving Monthly Budget Widget Stale on Monthly Override Edit
- **User Test Status:** Unverified in first pass
- **Files:**
  - `src/modules/widgets/components/widget-sync-processor.tsx`
- **Before-Fix Scenario (How to Reproduce):**
  1. Add the **Monthly Budget Progress** widget to your Android home screen.
  2. Open **Budgets**, tap an existing budget, and edit **only this month's target override** (which writes to `budget_monthly_targets` without modifying `category_budgets`).
  3. Return to the Android home screen.
  4. **Bug Observed:** The Monthly Budget widget still shows the old target amount because `WATCHED_TABLES` in `widget-sync-processor.tsx` omits `"budget_monthly_targets"`.
- **How We Will Properly Fix It:**
  1. Add `"budget_monthly_targets"` to `WATCHED_TABLES` in `src/modules/widgets/components/widget-sync-processor.tsx`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Edit a monthly budget target override in **Budgets** and check the Android Monthly Budget widget.
  2. **Expected Result:** The widget updates within ~1.5 seconds to reflect the new monthly target.

---

# Part 2 — Hidden Pre-Existing Bugs Found Across the App (11 Findings)

Below are the exact step-by-step reproduction instructions (especially for items `#3` through `#11` where you noted *"I don't know how to test/verify it"*), along with our fix and verification plan.

---

### [ ] P2-01 — [HIGH — Security] Setting a New App Lock Password Doesn't Activate Auto-Lock Until Force-Restart
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/security/hooks/use-app-lock.ts`
  - `src/modules/security/hooks/use-security-settings.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Start with App Lock **OFF** (no password set).
  2. Go to **Settings → Security**, set a new password, and set Lock Timeout to **Immediate**.
  3. Press Home to background the app, then reopen it.
  4. **Bug Observed:** The app opens completely unlocked until you force-close and restart the app.
- **How We Will Properly Fix It:**
  1. Add an in-memory security config pub/sub notifier (`notifySecurityConfigChanged` / `subscribeSecurityConfigChanged`) triggered whenever `setupAppPassword`, `removeAppPassword`, or `updateSecurityPreferences` runs.
  2. Subscribe `useAppLock` (used by `AppLockGate`) to reload `config` immediately when security settings change.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Set a new password in **Settings → Security** with timeout **Immediate**, press Home, and reopen the app (without force-closing).
  2. **Expected Result:** `LockScreen` immediately appears and requires your new password.

---

### [ ] P2-02 — [HIGH — Budgets] `BudgetLiveIndicator` & Save-Time `checkBudgetExceeded` Ignore All Subcategory Spending on Parent Budgets
- **User Test Status:** **Valid** (Confirmed)
- **Files:**
  - `src/modules/budgets/services/check-budget-exceeded.service.ts`
- **Before-Fix Scenario (How to Reproduce):**
  1. Create a `₱5,000` monthly budget on a parent category (e.g. **Food & Dining**).
  2. Record a `₱4,500` expense in a subcategory (e.g. **Food & Dining > Groceries**).
  3. Open **New Transaction**, pick **Food & Dining > Restaurants**, and type `1000`.
  4. **Bug Observed:** The live budget bar inside the form only sees `₱0` prior spend (showing 20% used instead of 110% exceeded) and saving triggers no budget-exceeded alert!
- **How We Will Properly Fix It:**
  1. In `getBudgetLiveSnapshot()` and `checkBudgetExceeded()` (`check-budget-exceeded.service.ts`), query child subcategories from `listCategories()` (matching `calculate-category-budget.service.ts`) instead of reading `budgetCategory.subcategories` from `getCategory()` (which never populates `.subcategories`).
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Repeat the 3 steps above (`₱5,000` budget on parent category, `₱4,500` spent in subcategory A, type `₱1,000` in subcategory B).
  2. **Expected Result:** The live indicator inside `TransactionFormModal` shows `₱5,500 / ₱5,000 (110% — Exceeded by ₱500)` in red, and saving shows the budget-exceeded notification.

---

### [ ] P2-03 — [HIGH — Budgets] Budgets Screen Stays Stale After Returning from "View Transactions" & Error Modal Cannot Be Dismissed
- **User Note:** *"I don't how to test it"*
- **Exact Step-by-Step Scenario (How You Can Test It Right Now in 15 Seconds):**
  1. Go to **Budgets** (make sure you have at least 1 active budget, e.g. **Food & Dining** showing `₱1,000 / ₱5,000`).
  2. Tap that **Food & Dining** budget card to open its detail modal, then tap **"View transactions"** at the bottom of the modal.
  3. This navigates you to the **Transactions** screen filtered to Food & Dining.
  4. On that Transactions screen, tap **`+`** (or edit/delete an existing Food & Dining transaction) to add a `₱500` Food & Dining expense.
  5. Now tap the top-left **Back (`←`)** button to return to the **Budgets** screen.
  6. **Bug Observed:** Look at the **Food & Dining** budget card on the Budgets screen—it still says `₱1,000 / ₱5,000` instead of `₱1,500 / ₱5,000`! It never refreshed when you came back!
- **Files:**
  - `src/modules/budgets/hooks/use-budgets.ts`
  - `src/modules/budgets/screens/budgets-screen.tsx`
- **How We Will Properly Fix It:**
  1. In `useBudgets` (`use-budgets.ts`), replace the mount-only `useEffect` with `useFocusEffect` and subscribe to `FINANCE_APP_TRANSACTION_MUTATED` (using `runDeferredSyncQuery` per `AGENTS.md` §19.5) so returning to **Budgets** or mutating transactions via Global Quick Entry always refreshes budget progress.
  2. In `budgets-screen.tsx` (line 574), wire `onClose={clearError}` on `<NotificationModal>` instead of `onClose={() => {}}` so an error modal can always be dismissed.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Follow the exact 5 steps above (Budgets → tap budget → **View transactions** → add/delete an expense → press **Back** to Budgets).
  2. **Expected Result:** The Budgets screen immediately shows the updated `₱1,500 / ₱5,000` spent total upon returning.

---

### [ ] P2-04 — [HIGH — Calendar & Dashboard] Split Transactions Broken in Calendar Net Tab & Dashboard Top Categories; Calendar Net Labels Subcategories `"Other"`
- **User Note:** *"I don't know how to test it"*
- **Exact Step-by-Step Scenario (How You Can Test All 3 Symptoms in 30 Seconds):**
  1. **Symptom A (Subcategory shows as `"Other"` in Calendar Net tab):**
     - Record an ordinary `₱500` expense and pick a **Subcategory** (for example: tap **Food & Dining**, then pick one of its subcategories like **Groceries** or **Coffee**).
     - Go to **Calendar**, tap the **Net** tab (3rd tab below the calendar), and scroll down to **Top Expense Categories**.
     - **Bug Observed:** Instead of showing `"Groceries"` (or `"Food & Dining"`), the category row is labeled **`"Other"`** with a generic gray icon! (Because `use-calendar-data.ts` line 530 builds `categoryMap` from top-level `categories` without flattening `c.subcategories`!).
  2. **Symptom B & C (Split transaction missing from Calendar Net & lumped into `"Uncategorized"` on Dashboard):**
     - Tap **`+`** to create a new Expense of `₱1,000`, toggle **Split Transaction ON**, and split it into `₱600` **Shopping** + `₱400` **Entertainment**, then tap **Save**.
     - Look at **Calendar → Net tab → Top Expense Categories**: **Bug Observed:** Your `₱1,000` split expense is completely missing from the category breakdown (`₱0` Shopping, `₱0` Entertainment)!
     - Look at **Dashboard → Top Spending Categories**: **Bug Observed:** Instead of adding `₱600` to Shopping and `₱400` to Entertainment, the Dashboard lumps the entire `₱1,000` under **`"Uncategorized"`**!
- **Files:**
  - `src/modules/calendar/hooks/use-calendar-data.ts`
  - `src/modules/dashboard/repositories/dashboard.repository.ts`
- **How We Will Properly Fix It:**
  1. In `useCalendarData` (`use-calendar-data.ts`, lines 511–552):
     - Flatten both parent `categories` and `c.subcategories` into `categoryMap` so subcategories display their real name, icon, and color instead of `"Other"`.
     - When `tx.isSplit && tx.entries?.length > 0`, iterate `tx.entries` and add each split entry's `amountMinorUnits` to its respective `entry.categoryId`.
  2. In `getTopExpenseCategories` (`dashboard.repository.ts`, lines 117–176):
     - Sum non-split expenses (`is_split = 0`) from `transactions` **plus** split child entries (`is_split = 1`) from `transaction_entries` grouped by `transaction_entries.category_id` so split expenses are accurately attributed to their real categories instead of `"Uncategorized"`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Repeat Symptom A (expense in a subcategory) and Symptom B/C (`₱600` Shopping + `₱400` Entertainment split expense).
  2. **Expected Result:** Calendar **Net** tab shows the real subcategory name (never `"Other"`), and both **Calendar Net** and **Dashboard Top Categories** show `₱600` under Shopping and `₱400` under Entertainment.

---

### [ ] P2-05 — [HIGH — Subscriptions] Subscriptions Saved with `amount = 0` or `categoryId = null` Crash "Mark Paid"; Picking `firstBillingDate = Today` Skips a Full Month
- **User Note:** *"I don't know how to come up this, since when I open the form, account and categories are pre select"*
- **Why Account & Category Are Pre-Selected on Open, and How This Bug Actually Happens:**
  - You are completely right that `SubscriptionFormModal` pre-selects an account and a category when you open it! Here are the **3 real ways** users trigger this bug in the form right now:
    1. **Leaving Amount at `0.00` (Easy to test right now!):**
       - Go to **Subscriptions** → tap **`+`**.
       - Type a name like `"Netflix"` (do **not** type an amount, leave Amount at `0.00`) and tap **Save**.
       - It lets you save a `₱0.00` subscription! Now tap that `"Netflix"` subscription and tap **Mark Paid**.
       - **Bug Observed:** It fails with an error (`"Enter a valid amount greater than zero"`) because `saveSubscription` allowed `amountMinorUnits = 0` while `createTransaction` rejects `0`!
    2. **Picking Today's Date in the Date Picker Skips a Full Cycle (Easy to test right now!):**
       - Go to **Subscriptions** → tap **`+`**, type `"Spotify"`, enter amount `149`, and leave Billing Cycle as **Monthly**.
       - Tap **First Billing Date**, tap **Today's date** on the calendar picker, and tap **Confirm**, then tap **Save**.
       - **Bug Observed:** Even though you set First Billing Date to **Today**, look at the saved subscription card's **Next Renewal Date**—it immediately jumped to **next month** instead of today! (Because `DatePickerModal` returns today at `00:00:00` midnight, and `resolveUpcomingRenewal()` compares `00:00:00 < Date.now()`, thinking today already passed!).
    3. **How `categoryId` becomes `null`:**
       - Create a subscription using a custom category (e.g. `"Streaming"`), then go to **Categories** and delete `"Streaming"`. SQLite sets the subscription's `category_id = NULL`. When you tap **Mark Paid** on that subscription, it crashes with `"Category is required"`.
- **Files:**
  - `src/modules/subscriptions/schemas/subscription.schema.ts`
  - `src/modules/subscriptions/components/subscription-form-modal.tsx`
  - `src/modules/subscriptions/services/save-subscription.service.ts`
  - `src/modules/subscriptions/services/record-subscription-payment.service.ts`
- **How We Will Properly Fix It:**
  1. Require `amountMinorUnits > 0` (`z.number().int().positive()`) and validate in `SubscriptionFormModal` before saving so users cannot save a `₱0.00` subscription that fails on Mark Paid.
  2. In `recordSubscriptionPayment()`, if a subscription's linked category was later deleted (`categoryId === null`), automatically fall back to a default expense category (`"Entertainment"` / `"Other Expenses"` / first active expense category) instead of crashing.
  3. In `resolveUpcomingRenewal()` (`save-subscription.service.ts`), compare calendar date keys (`toDateKey(candidate) >= toDateKey(now)`) instead of raw millisecond timestamps (`candidate.getTime() >= now.getTime()`) so picking **Today** in the date picker keeps `nextRenewalDate = today`.
  4. On edit in `saveSubscription()`, preserve the existing `existing.createdAt` instead of overwriting `createdAt: now`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Try saving a subscription with `0.00` amount → form shows a clear validation prompt requiring an amount greater than 0.
  2. Create a monthly subscription and select **Today** in the First Billing Date picker → saved subscription shows **Today** as its renewal date instead of skipping to next month.

---

### [ ] P2-06 — [MEDIUM–HIGH — Currencies] Weak / 0-Decimal Currencies (`KRW`, `VND`, `IDR`, `JPY`) → `USD` Fail or Miscalculate by +50%
- **User Note:** *"I don't know how to test it"*
- **Exact Step-by-Step Scenario (How You Can Test It Right Now in 20 Seconds):**
  1. Go to **Settings → Currency** and change your **Default Currency** to **`USD ($)`**.
  2. Create (or use) an Account whose currency is **`USD ($)`**.
  3. Tap **`+` (New Transaction)**, select your **`USD ($)`** account, and tap the small **Currency pill** next to the amount input to change the transaction's currency to **`KRW (₩ - South Korean Won)`** or **`VND (₫ - Vietnamese Dong)`**.
  4. Enter an amount like `50000` (`₩50,000`), pick any category, and tap **Save** ( leaving the custom exchange rate box blank so it uses the built-in rate book).
  5. **Bug Observed:** It refuses to save and pops up an error: **`"Exchange rate must be greater than zero"`**!
     - *Why?* Because `snapshotExchangeRateFromBook` converts `1 KRW` (`$0.00074 USD`) into integer USD cents (`0.074 cents`) and rounds it with `Math.round(0.074)` → **`0 cents`**! Then it throws `"Exchange rate must be greater than zero"`!
     - And if you pick **`JPY (¥)`** (`1 JPY = $0.0067 USD = 0.67 cents`), `Math.round(0.67)` rounds to `1 cent ($0.01)`, overcharging every JPY→USD transaction by **+50%**!
- **Files:**
  - `src/utils/currency.ts`
- **How We Will Properly Fix It:**
  1. In `snapshotExchangeRateFromBook()` (`src/utils/currency.ts`, lines 755–786), compute the floating-point ratio directly from `DEFAULT_RATES_TO_PHP[from] / DEFAULT_RATES_TO_PHP[to]` (adjusted for minor-unit exponent difference `10 ** (toExp - fromExp)`) **before** scaling by `RATE_SCALE` (`1_000_000`) and rounding, instead of calling `convertCurrencyViaPhp(1, ...)` which rounds `1` unit to an integer minor unit first!
  2. Populate `DEFAULT_RATES_TO_PHP` for all 155 active currencies in `CURRENCY_NAMES` so none of the newly added v1.8.0 currencies silently fall back to `1:1` with PHP.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Set Default/Account currency to **`USD ($)`**, open **New Transaction**, switch transaction currency to **`KRW (₩)`**, type `50000`, and tap **Save**.
  2. **Expected Result:** Saves cleanly with no error, converting `₩50,000 KRW` accurately to `~$37.04 USD` (and `¥10,000 JPY` to `~$66.67 USD` instead of `$100.00 USD`).

---

### [ ] P2-07 — [MEDIUM–HIGH — Transactions] Multi-Currency / Cross-Currency Daily Group Header Totals & Refund Signs Wrong
- **User Note:** *"I don't know how to verify it"*
- **Exact Step-by-Step Scenario (How You Can Verify It in 20 Seconds):**
  1. Use an account whose currency is **`PHP (₱)`** (e.g. `"Cash"` in PHP).
  2. Tap **`+` (New Transaction)** on that **`PHP`** account, tap the currency pill on the amount field to enter the expense in **`USD ($)`**, type **`10`** (`$10.00`, which converts to **`₱585.00`** on your PHP account), and tap **Save**.
  3. Go to the **Transactions** screen and look at the **Date Header** above that transaction (e.g. `TODAY` and the daily total on the right side of the date header).
  4. **Bug Observed:** Look at the daily total on the right side of the Date Header: it says **`-$585.00`** (with a **`$` dollar sign** instead of **`₱` peso sign**)!
     - *Why?* Because `amountMinorUnits` is stored in the **account's currency** (`58500` PHP centavos), but `groupedSections` in `transactions-screen.tsx` (line 754) reads `tx.currencyCode` (`"USD"`) instead of `tx.accountCurrency` (`"PHP"`), slapping a `$` symbol onto `585.00` PHP!
- **Files:**
  - `src/modules/transactions/screens/transactions-screen.tsx`
- **How We Will Properly Fix It:**
  1. In `groupedSections` (`transactions-screen.tsx`, lines 752–761), use `tx.accountCurrency` (the currency that `tx.amountMinorUnits` is actually denominated in) instead of `tx.currencyCode`.
  2. If a single date section contains accounts with different `accountCurrency` codes, convert each transaction's `amountMinorUnits` into `defaultCurrency` via `convertToDefaultCurrency(tx.amountMinorUnits, tx.accountCurrency)` before summing the daily header total.
  3. Preserve the sign of `tx.amountMinorUnits` for expense refunds (`tx.type === "expense" && tx.amountMinorUnits > 0`) instead of forcing `-Math.abs(...)`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Record a `$10.00 USD` expense on a `PHP` account (`₱585.00`) and check the date header on the **Transactions** screen.
  2. **Expected Result:** The date header displays **`-₱585.00`** (in PHP, matching the amount deducted from the account) instead of `-$585.00`.

---

### [ ] P2-08 — [MEDIUM — Credit Cards] Editing an Already-Billed Charge Amount Never Adjusts Statement; `billedItems` Includes Deleted Charges
- **User Note:** *"I don't know how to test it"*
- **Exact Step-by-Step Scenario (How You Can Test It in 30 Seconds):**
  1. Create a **Credit Card** account with **Credit Limit = `50,000`**, **Statement Day = `10`**, and **Payment Due Day = `25`**.
  2. Record an expense of **`₱1,000`** on that Credit Card dated **earlier this month before the 10th** (e.g. **Nov 5, 2026**, since today is Nov 20 and the Nov 10 statement has already been issued).
  3. Go to **Accounts**, tap your Credit Card to view its **Statement / Billed Balance** → it shows **`₱1,000.00`** billed.
  4. Now go to **Transactions**, tap that **Nov 5** credit card expense:
     - **Test A (Edit amount):** Change the amount from **`₱1,000`** to **`₱3,000`** and tap **Save**. Return to **Accounts** and check the Credit Card's billed statement amount → **Bug Observed:** The statement still says **`₱1,000.00`** instead of **`₱3,000.00`**!
     - **Test B (Delete charge):** Delete that Nov 5 credit card expense to Trash, then open the Credit Card's **Billed Items / Statement breakdown** → **Bug Observed:** The deleted transaction still shows up inside the statement's `billedItems` list!
- **Files:**
  - `src/modules/credit-cards/services/reconcile-credit-card-billing.service.ts`
  - `src/modules/credit-cards/services/get-credit-card-monitoring.service.ts`
- **How We Will Properly Fix It:**
  1. In `reconcileCreditCardBillingInContext()` (`reconcile-credit-card-billing.service.ts`, lines 261–276), compare each already-linked active charge's current `amountMinorUnits` against `linkedItem.amountMinorUnits` (or recompute the statement's net billed delta whenever linked active charges change amount) and record an adjustment / update `linkedItem.amountMinorUnits` + `statement.adjustedAmountMinorUnits`.
  2. In `getCreditCardMonitoring()` (`get-credit-card-monitoring.service.ts`, lines 147–166), include `adjustedAmountMinorUnits` in `issuedAmount` and filter out soft-deleted transactions (`isNull(transactions.deletedAt)`) when loading `billedItems`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Edit the Nov 5 billed credit card charge from `₱1,000` to `₱3,000` → statement balance updates to `₱3,000`.
  2. Delete the Nov 5 charge → statement balance adjusts down and the deleted transaction no longer appears in `billedItems`.

---

### [ ] P2-09 — [MEDIUM — Notes] Free-Tier 10-Note Limit Bypass & Vanishing `+` FAB During Search
- **User Note:** *"I don't know how to test it"*
- **Exact Step-by-Step Scenario (How You Can Test Both in 15 Seconds):**
  1. Open **Notes** (ensure you have at least 1 note).
  2. In the **Search notes...** bar at the top, type `"zzzzzz"` (something that matches 0 notes).
  3. **Bug 1 Observed (Vanishing `+` FAB):** Look at the bottom-right corner of the screen—the **`+` (Add Note) floating button completely disappeared** just because your search had 0 matches!
  4. **Bug 2 Observed (Free 10-note limit bypass):** As a Free user with 10 notes (the maximum free limit), if you type a search query that matches only 1 note (so the `+` button stays visible) and tap **`+`**, it lets you create an 11th, 12th, 13th note for free because `handleOpenAdd` checks `notes.length >= 10` on the **search-filtered array** (`length === 1`) instead of total notes (`10`)!
- **Files:**
  - `src/modules/notes/hooks/use-notes.ts`
  - `src/modules/notes/screens/notes-screen.tsx`
- **How We Will Properly Fix It:**
  1. Expose `totalNotesCount` (the unfiltered total count of active notes) from `useNotes()`.
  2. In `NotesScreen` (`notes-screen.tsx`):
     - Check `totalNotesCount >= PRO_LIMITS.FREE_MAX_NOTES` inside `handleOpenAdd` instead of `notes.length`.
     - Show the bottom-right `+` FAB whenever `totalNotesCount > 0` (even when a search filter returns 0 matching rows).
- **Post-Fix Verification (How to Confirm Resolved):**
  1. With ≥1 note, search `"zzzzzz"` in **Notes** → the bottom-right `+` FAB stays visible.
  2. As a Free user with 10 notes, filter the list by search to 1 match and tap `+` → the **Unlock Pro** modal appears as expected.

---

### [ ] P2-10 — [MEDIUM — Security / Auth] `connectGoogleDrive()` Doesn't Suspend App Lock
- **User Note:** *"I don't know how to test it"*
- **Exact Step-by-Step Scenario (How You Can Test It in 20 Seconds):**
  1. Go to **Settings → Security**, enable **App Lock** with a password, and set **Auto-Lock Timeout** to **Immediate**.
  2. Go to **Settings → Google Drive Backup** (disconnect if already connected).
  3. Tap **Connect Google Drive** — Android opens the native Google Account Picker overlay (which briefly moves the app to `AppState = "background"` / `"inactive"`).
  4. Pick your Google account to finish signing in.
  5. **Bug Observed:** The moment the Google account picker closes and returns to the app, **the App Lock password screen pops up in your face**, forcing you to unlock the app right in the middle of connecting Google Drive! (Notice that `pickImportFile` and `pickAttachment` already call `suspendAutoLock()` before opening native pickers, but `connectGoogleDrive()` forgot to call it!).
- **Files:**
  - `src/modules/google-drive-backup/services/google-drive-auth.service.ts`
- **How We Will Properly Fix It:**
  1. Wrap `connectGoogleDrive()` in `google-drive-auth.service.ts` with `const resumeAutoLock = suspendAutoLock(); try { ... } finally { resumeAutoLock(); }`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. With App Lock ON (**Immediate** timeout), tap **Connect Google Drive** and complete Google Sign-In.
  2. **Expected Result:** Returns smoothly to the Google Drive Backup screen without triggering the App Lock screen.

---

### [ ] P2-11 — [MEDIUM — Categories / Transactions / Budgets / CSV Round-Trip] 4 Smaller Polish & Integrity Fixes
- **User Note:** *"I don't know how to test it"*
- **Exact Step-by-Step Scenarios for Each of the 4 Sub-Items:**
  1. **11a — `CategoriesScreen` doesn't refresh after quick-adding a category inside `TransactionFormModal`:**
     - **How to test:** Open the **Categories** screen from the sidebar. While staying on the Categories screen, tap the bottom-right **`+` (Quick Add Transaction)** FAB (or shake the phone) to open `TransactionFormModal`. Inside the transaction form, tap **Category → `+ New Category`**, create `"Pet Care"`, and close the transaction form.
     - **Bug Observed:** You are looking right at the **Categories** screen, and `"Pet Care"` is **not there** until you navigate away and come back!
     - **Fix:** Add `useFocusEffect` + a category-change refresh event to `useCategories`.
  2. **11b — `TransactionFormModal` Save button lacks a synchronous ref lock against rapid double-tap:**
     - **How to test:** Open **New Transaction**, enter `100`, pick a category, and rapidly double-tap **Save** twice with two fingers.
     - **Bug Observed:** Because `isSubmitting` is React `useState` (which updates asynchronously on the next render), two taps within the same frame both pass `if (isSubmitting) return;` and insert **2 duplicate transactions**!
     - **Fix:** Add a synchronous `submittingRef = useRef(false)` guard at the top of `handleSubmit` in `transaction-form-modal.tsx`.
  3. **11c — DST off-by-1-day math in `daily` and `biweekly` budget periods:**
     - **How to test:** Covered via automated unit test in `budget-period.test.ts` simulating a US/EU Daylight Saving Time transition date (`23-hour` / `25-hour` day where `86_400_000ms` arithmetic shifts midnight to `23:00` the previous day).
     - **Fix:** Use calendar-day arithmetic (`new Date(y, m, d - 1)` and `Date.UTC(y, m, d)`) in `src/modules/budgets/utils/budget-period.ts`.
  4. **11d — Export → Re-Import Accounts CSV drops archived status & lacks CSV formula-injection neutralization:**
     - **How to test:** Have 1 Active account and 1 Archived account on **Accounts** (toggle **Show Archived** ON). Export Accounts CSV, then go to **Data Import → Import Accounts** and import that CSV into a fresh workspace → the archived account is imported as **Active**, and any account note starting with `=1+1` is written unescaped to CSV.
     - **Fix:** Prefix dangerous formula cells (`=`, `+`, `-`, `@` on text columns) during CSV export and support the `Status` (`Archived` / `Active`) column on Accounts CSV import.

---

# Part 3 — Performance Assessment (60–120fps Standard) (5 Items)

You mentioned *"I don't know how to verify it"* for Part 3 `#1` through `#5`. Because performance items are sub-second frame timings and internal SQLite query counts, here is **both** how you can visually feel/observe them on your phone **and** how we verify them with automated SQLite query-count & timing assertions.

---

### [ ] P3-01 — Startup Stall: `seedCurrenciesIfEmpty()` & `seedDefaultCategoriesIfEmpty()` Run 155+ Unbatched Synchronous SQLite Commits Outside a Transaction
- **How to Observe & Verify:**
  - **On Device:** On a fresh install, app reset, or v1.7.0 → v1.8.0 upgrade, SQLite currently opens and commits **155 separate disk transactions** one by one in a `.forEach()` loop on the main JS thread (~150ms–1,200ms freeze on Android flash storage).
  - **How We Fix It:** Wrap `seedCurrenciesIfEmpty()` (`seed-currencies.service.ts`) and `seedDefaultCategoriesIfEmpty()` (`seed-default-categories.service.ts`) in `db.transaction((tx) => ...)` so all 155 rows commit in **1 single atomic disk flush** (<5ms).
  - **Verification:** We will log/assert the execution time and transaction count in an automated test (`< 10ms` in-transaction vs 155 autocommits) and verify instant first-boot/reset transition.

---

### [ ] P3-02 — Picker Scroll/Mount Jank: `CurrencyPickerModal` Renders All 155 Currencies in a `<ScrollView>` Instead of `<FlatList>`
- **How You Can Observe It on Your Phone Right Now:**
  1. Open **Settings → Currency** and tap **Default Currency** (or open any Account form and tap **Currency**) to open the **Currency Picker Modal**.
  2. Notice the slight pause when the modal opens and when typing in the `"Search currency..."` box—because `<ScrollView>` mounts **all 155 currency rows (~1,000+ React Native views)** at once instead of virtualizing the 10 visible rows on screen!
- **Files:**
  - `src/modules/currencies/components/currency-picker-modal.tsx`
- **How We Will Properly Fix It:**
  1. Replace the `<ScrollView>` list inside `CurrencyPickerModal` with a virtualized `<FlatList>` using a memoized `CurrencyRow` component, `keyExtractor={(item) => item.code}`, `initialNumToRender={15}`, `maxToRenderPerBatch={15}`, and `windowSize={5}` (while keeping the custom-currency creation form in `ListHeaderComponent` / modal state).
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open the **Currency Picker Modal** and rapidly type/clear in the search box and flick-scroll from `PHP` to `ZWL`.
  2. **Expected Result:** Opens on frame 1 and scrolls/filters at a locked 60–120fps.

---

### [ ] P3-03 — Trash Full-Ledger Double Scan: `listDeletedTransactions()` Scans All Active Transactions Twice Whenever Trash Has ≥1 Item
- **How You Can Observe It:**
  1. If a workspace has thousands of active transactions and you delete just **1 transaction** to Trash, opening the **Trash** tab on the Transactions screen calls `getBalanceAfterByTransactionId(null)` and `getPocketBalanceAfterByTransactionId(null)`—which scan **every active transaction in the entire database twice**, even though deleted rows aren't even in the active balance map!
- **Files:**
  - `src/modules/transactions/services/get-transactions.service.ts`
- **How We Will Properly Fix It:**
  1. In `listDeletedTransactions()` (`get-transactions.service.ts`, lines 387–419), remove the two dead calls to `getBalanceAfterByTransactionId(null)` and `getPocketBalanceAfterByTransactionId(null)` and pass empty `Map`s directly.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open **Transactions → Trash** with ≥1 deleted transaction.
  2. **Expected Result:** Trash opens instantaneously (`O(deleted_rows)` instead of `2 × O(all_active_transactions)`), verified with a SQLite query-count unit test.

---

### [ ] P3-04 — Global Search Mount Storm & Un-Debounced SQL on Every Keystroke
- **How You Can Observe It on Your Phone:**
  1. Tap the top-right **Global Search (magnifying glass)** icon and type a word quickly (e.g. `"groceries"`).
  2. Right now:
     - The moment you tap the Search icon (even with an empty input box!), `useGeneralSearch` mounts **8 domain hooks at once**—including `useScheduledTransactions()`, which executes `processDueSchedules()` (database writes!) on mount!
     - Every single letter you type (`g`, `gr`, `gro`, `groc`...) fires synchronous SQLite `LIKE '%...%'` queries on the JS thread without a 150ms debounce (`AGENTS.md` §19.7 requires ~150ms debounce, instant on clear).
- **Files:**
  - `src/modules/search/hooks/use-general-search.ts`
- **How We Will Properly Fix It:**
  1. Debounce the active search evaluation / SQLite `searchTransactionsByQuery` by `150ms` when typing (clearing immediately to `""` when the user clears the input).
  2. Defer heavy domain hook queries until the modal has painted (`isOpen`) and avoid running schedule auto-post writes just by opening the Search modal.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Open **Global Search** and type quickly in the search bar.
  2. **Expected Result:** Modal opens without a mount hitch and typing stays completely fluid with zero keystroke lag.

---

### [ ] P3-05 — Unneeded Synchronous Work on Focus/Navigation & CSV Export
- **What This Covers & How We Will Fix & Verify Each Sub-Item:**
  1. **Transactions CSV Export runs 2 full-ledger balance scans for columns CSV doesn't even include (`transactions-screen.tsx` line 552):**
     - Pass `includeBalances: false` inside `handlePrepareExportCsv()` so exporting CSV doesn't run two full-ledger running-balance scans that aren't even written to the CSV!
  2. **`DashboardScreen` calls `getAccountsWithBalances` twice on every focus (`get-dashboard-summary.service.ts` line 25):**
     - Pass `includeManagementFlags: false` inside `getDashboardSummary()` (since Dashboard never reads `isDeletable` or `canChangeCurrency`), eliminating 3 extra `GROUP BY accountId` queries on every Dashboard focus.
  3. **`useSubscriptions` runs synchronous SQLite queries on frame 1 of navigation (`use-subscriptions.ts` line 67):**
     - Wrap `refresh()` inside `useFocusEffect` with `runDeferredSyncQuery()` and cancel on blur/unmount so navigating to **Subscriptions** never blocks the screen transition animation.
  4. **Chunk category `IN (...)` queries at 500 IDs (`transactions.repository.ts` lines 1072, 1106, 1143):**
     - Apply the same 500-ID chunking helper (`AGENTS.md` §19.4) to `getCategoryExpenseTotal`, `getCategoryExpenseTotalsGrouped`, and `listExpenseEntryTotalsByCategory`.
- **Post-Fix Verification (How to Confirm Resolved):**
  1. Navigate across **Dashboard**, **Subscriptions**, and **Transactions → Export CSV**, plus run `npm test` and `npx tsc --noEmit`.
  2. **Expected Result:** Zero frame drops on screen transitions, faster CSV preparation, and 100% test pass rate.
