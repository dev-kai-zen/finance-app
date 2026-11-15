# Manual Testing Guide: Kaizen v1.5.0 (Upgrading from v1.4.0)

This testing manual provides step-by-step instructions for manually verifying all new features, improvements, and bug fixes introduced in **v1.5.0**.

---

## Quick Feature Checklist

| # | Feature / Change | Category | Primary Screen / Navigation | Status |
|---|---|---|---|---|
| **1** | CSV Data Import Wizard (Guided Accounts & Transactions) | New Feature | `Settings` → `Backup & Data` → `Import data` | `[ ]` |
| **2** | CSV Templates (Download & Share) | New Feature | `Settings` → `Import data` → `Download Template` | `[ ]` |
| **3** | Advance Posting for Scheduled Transactions | New Feature | `Scheduled Transactions` → `Advance post` | `[ ]` |
| **4** | Interactive Net Worth Chart Touch Tooltips | Improvement | `Dashboard` → Net Worth Card | `[ ]` |
| **5** | Credit Cards Statement Filtering & Dedicated Activity Modal | Improvement | `Credit Cards` → Billed / Unbilled / Statement History | `[ ]` |
| **6** | Renamed Navigation Title to "Credit Cards" | Improvement | `Credit Cards` (Header Title) | `[ ]` |
| **7** | Unified Transaction Date & Time Entry | Improvement | `+` (New Transaction) / Edit Transaction | `[ ]` |
| **8** | Horizontal Scroll Arrow Buttons | Improvement | `Calendar`, `Reports`, `Budgets`, `Credit Cards` | `[ ]` |
| **9** | Terms of Service Link in Settings | Improvement | `Settings` → `About` → `Terms of Service` | `[ ]` |
| **10** | Simplified Data Reset Confirmation (`RESET`) | Improvement | `Settings` → `Backup & Data` → `Reset Data` | `[ ]` |
| **11** | Docked Walkthrough Guide Button into Header | Fix / UX | `Dashboard`, `Accounts`, `Transactions`, `Budgets`, etc. | `[ ]` |
| **12** | Walkthrough Intro Modal Enhancements & Touch Shield | Fix / UX | Tap Guide (Sparkles icon) in Top Header | `[ ]` |
| **13** | Credit Card Amounts Masking in Privacy Mode | Fix | Top Header Eye Icon → `Credit Cards` | `[ ]` |
| **14** | App Lock Prevention during External OS Operations | Fix | Share Backup, Photo Picker, File Picker | `[ ]` |
| **15** | App Lock Gate on Version History & Dev Message | Fix | App Lock active state | `[ ]` |
| **16** | Developer Message Section Title Border Fix | Fix | `Settings` → `Developer Message` | `[ ]` |
| **17** | Chart Month Label & Recent Amount Edge Spacing | Fix | `Dashboard` & `Reports` Charts | `[ ]` |

---

## 1. CSV Data Import Wizard

### 1.1 Download & Share CSV Templates
* **Where to go:**
  1. Open the left sidebar menu (or Settings tab).
  2. Tap **Settings**.
  3. Scroll down to the **Backup & Data** section.
  4. Tap **Import data** (opens the CSV Import Wizard).
* **Steps to Test:**
  1. On the initial step ("Select File"), tap **Download Template** or **Share Template**.
  2. Choose either **Accounts Template** or **Transactions Template**.
  3. Verify the native file save picker or system share sheet appears.
  4. Save the file or share it to your device storage/drive.
  5. Open the saved file in a text editor or spreadsheet app and verify headers match Kaizen import specifications.
* **Expected Result:**
  * Templates generate cleanly with proper column headers (`Date`, `Amount`, `Account`, `Category`, `Type`, `Description`, etc.).

---

### 1.2 Import CSV Workflow & Guided Matching
* **Where to go:**
  * `Settings` → `Backup & Data` → `Import data`
* **Pre-conditions:**
  * Have a test CSV file ready (or populate the downloaded template with 3–5 sample transactions).
* **Steps to Test:**
  1. **Step 1 - File Selection:**
     - Tap **Select CSV File**.
     - Pick your CSV file (file must be under 2 MiB and ≤ 1,000 records).
     - Verify file name, record count, and file size are displayed.
  2. **Step 2 - Format & Column Mapping:**
     - Set column mappings for: Date, Amount, Account, Category, Type, and Description.
     - Verify the **Date Format sample** displays both the raw text from your CSV and how Kaizen interprets it.
     - If your CSV uses custom transaction types (e.g., "DEBIT", "CREDIT", "EXP"), map them to Kaizen's standard types (`expense`, `income`, `transfer`).
  3. **Step 3 - Account Mapping:**
     - Map the CSV source account names to your existing Kaizen accounts, or choose to create a new account.
     - Review opening balances.
  4. **Step 4 - Category Mapping & Kai Knowledge:**
     - Check auto-matched categories.
     - Notice how unmatched categories leverage Kai's category suggestions.
     - Map unmatched categories to existing categories or choose "Leave out".
  5. **Step 5 - Review & Commit:**
     - Inspect the Review tab: records should be categorized into **Ready to import**, **Needs attention**, and **Will be left out**.
     - Tap on a row to edit/correct any field directly.
     - Notice if any duplicate/similar records are flagged with a warning banner.
     - Check the **"Save safety backup before importing"** toggle (keep it ON).
     - Tap **Import records** and confirm the dialog.
* **Expected Result:**
  * Safety backup is automatically created in local backups.
  * Synchronous SQLite batch inserts all records without UI freezing.
  * Navigating to **Transactions** and **Accounts** shows the imported entries and correctly updated account balances.

---

## 2. Advance Posting for Scheduled Transactions

* **Where to go:**
  1. Open the sidebar navigation.
  2. Tap **Scheduled Transactions** (or navigate from Transactions screen).
* **Pre-conditions:**
  * At least one active recurring schedule exists (e.g., Monthly Rent or Subscription due next week).
* **Steps to Test:**
  1. Locate the schedule card.
  2. Look for the **Advance post** chip/button directly on the card.
  3. Tap **Advance post**.
  4. Verify the **Advance Post Modal** opens and displays:
     - Schedule Name and Amount.
     - Current scheduled date vs. Next cycle date after advance posting.
     - Date picker (defaults to today or scheduled date).
  5. Select a transaction posting date and tap **Post Now** / **Confirm**.
  6. Return to **Scheduled Transactions**:
     - Check the schedule: verify its next due date has advanced to the next occurrence (e.g., from Nov 15 to Dec 15).
  7. Go to **Transactions** screen:
     - Verify a new transaction entry has been created immediately with the selected amount, account, category, and date.
* **Expected Result:**
  * Transaction records immediately into the ledger.
  * Schedule cycle advances smoothly to the next cycle without skipping occurrences or corrupting sequence numbers.

---

## 3. Interactive Net Worth Chart Touch Tooltips

* **Where to go:**
  1. Open **Dashboard** (Home).
  2. Scroll to the **Net Worth** card and chart.
* **Steps to Test:**
  1. **Touch to inspect:** Tap anywhere along the blue Net Worth trend line.
  2. **Drag along timeline:** Hold and drag your finger left and right across data points.
  3. Verify the floating **Tooltip Card** dynamically updates, showing:
     - Selected Date (formatted cleanly).
     - **Net Worth** amount in primary blue.
     - **Assets** amount in green.
     - **Liabilities** amount in coral/orange.
  4. **Close Tooltip:** Tap the dedicated **X** (close) icon on the top-right corner of the tooltip card.
  5. **Verify Edge Spacing:** Check the rightmost and bottom edges of the chart—verify month labels and latest balance amounts are fully visible without being cut off.
* **Expected Result:**
  * Smooth touch interaction without chart jitter or off-screen clipping.

---

## 4. Credit Cards: Title, Cutoff Filtering & Dedicated Activity Screen

* **Where to go:**
  1. Open the sidebar menu.
  2. Tap **Credit Cards** (formerly "Credit Card Monitoring").
* **Steps to Test:**
  1. **Header Title Verification:**
     - Verify the screen title in the top bar reads **Credit Cards**.
  2. **Statement Activity Modal:**
     - Locate a credit card with billed transactions.
     - Tap **View all [X] billed items** (or tap any statement row in **Statement history**).
     - Verify the **Credit Card Activity Modal** opens full-screen or as a dedicated sheet.
     - Check: Statement period header, due date, statement total, and itemized transaction list.
  3. **Unbilled Activity Modal:**
     - Tap **View all [X] unbilled items**.
     - Verify only transactions made *after* the statement cutoff date appear.
* **Expected Result:**
  * Clear separation between billed and unbilled purchases based on statement cutoff dates.
  * Dedicated modal displays complete statement activity with clear navigation.

---

## 5. Credit Cards: Privacy Mode Masking

* **Where to go:**
  * Any screen with the top header bar (e.g., `Dashboard` or `Credit Cards`).
* **Steps to Test:**
  1. Navigate to **Credit Cards**.
  2. Note the visible billed amounts, unbilled balances, total balance, and statement amounts.
  3. Tap the **Eye icon** (Privacy / Stealth mode) in the top header.
  4. Inspect the **Credit Cards** screen:
     - Credit utilization ring amounts → Masked (`••••••`).
     - Outstanding balance → Masked.
     - Billed and unbilled totals → Masked.
     - Statement history amounts → Masked.
  5. Tap the **Eye icon** again to turn Privacy Mode off.
* **Expected Result:**
  * All sensitive credit balances are fully obscured when privacy mode is active and correctly restored when turned off.

---

## 6. Walkthrough Tours: Top Header Docking & Touch Shield

* **Where to go:**
  * Visit multiple screens: **Dashboard**, **Accounts**, **Transactions**, **Budgets**, **Calendar**, **Goals**, **Notes**, **Categories**, **Settings**.
* **Steps to Test:**
  1. **Header Docking:**
     - Check the top header bar on any of the screens above.
     - Verify the **Sparkles** (Guide) icon is cleanly docked in the header (next to the Privacy Eye icon).
     - Confirm that previous floating guide chips no longer overlap screen action buttons or search bars.
  2. **Walkthrough Intro Modal:**
     - Tap the **Sparkles** icon to launch the tour.
     - Notice the new modal design:
       - Distinct corner **X** button to close.
       - High-contrast, styled primary "Start Tour" button.
       - Clear secondary "Skip" button.
     - Tap the darkened backdrop outside the card: verify touch protection prevents accidental dismissal unless the close or skip button is tapped.
* **Expected Result:**
  * No UI button overlap on any screen; tours start cleanly and can be dismissed easily.

---

## 7. Unified Transaction Date & Time Entry

* **Where to go:**
  1. Tap the **+** (Add Transaction) button on Dashboard or Transactions screen.
* **Steps to Test:**
  1. Scroll down to the **Date & Time** row.
  2. Notice that the old "Today / Yesterday / Custom" pills have been replaced with a single, clean date button.
  3. Tap the **Date button**:
     - Verify the unified calendar picker opens.
     - Pick any past or future date and confirm.
     - Verify the selected date displays clearly on the button.
  4. If "Exact Time" is enabled in Customize Fields, tap the **Time button**:
     - Verify the time picker opens and updates time accurately.
  5. Save the transaction and verify it appears on the correct calendar date in the ledger.
* **Expected Result:**
  * Streamlined, uncluttered date input without redundant quick-date pills.

---

## 8. Horizontal Scroll Arrow Buttons

* **Where to go:**
  * Test any of the following screens with horizontal lists:
    - **Calendar**: Month / Week / Day view tabs header.
    - **Reports**: Tab bar (`Net Worth`, `Cash Flow`, `Balance Sheet`) and date filter bars.
    - **Transactions**: Category/account filter chips.
    - **Budgets**: Category selection tabs.
    - **Credit Cards**: Statement selection chips.
    - **Icon Picker Modal**: Category tabs across top.
* **Steps to Test:**
  1. Navigate to the screen on a mobile device or narrow viewport where items exceed the screen width.
  2. Notice that **smooth scroll arrow buttons** appear on the side where more items exist off-screen.
  3. Tap the scroll arrow button:
     - Verify the container smoothly scrolls incrementally.
  4. Scroll manually to the far end:
     - Verify the arrow button fades or disables when reaching the end of the scroll container.
* **Expected Result:**
  * Quick and accessible horizontal navigation without relying exclusively on finger swipes.

---

## 9. Terms of Service Link in Settings

* **Where to go:**
  1. Go to **Settings**.
  2. Scroll down to the **About** section (near Version and Privacy Policy).
* **Steps to Test:**
  1. Locate the **Terms of Service** row (with a document icon).
  2. Tap **Terms of Service**.
  3. Verify the external system browser opens loading the Terms page.
* **Expected Result:**
  * Clean link adjacent to Privacy Policy that opens external terms without crashing.

---

## 10. Simplified Data Reset Confirmation (`RESET`)

* **Where to go:**
  1. Go to **Settings**.
  2. Scroll to the bottom to **Backup & Data** or **Danger Zone**.
  3. Tap **Reset All Data** (or Erase Data).
* **Steps to Test:**
  1. In the confirmation modal, read the instruction prompt.
  2. Verify the required phrase and input placeholder is now **RESET** (previously required typing "KAIZEN").
  3. Type random characters: verify the "Confirm Delete" button stays disabled.
  4. Type `RESET` (or lowercase `reset`): verify the "Confirm Delete" button becomes active and clickable.
  5. Tap **Cancel** to safely dismiss the modal without resetting.
* **Expected Result:**
  * Reset confirmation is intuitive, case-insensitive, and simpler to execute.

---

## 11. Security & App Lock: Prevent Lock During External Operations

* **Where to go:**
  1. Go to **Settings** → **Security**.
  2. Enable **App Lock** (PIN or Biometrics) with Immediate lock or short timeout.
* **Steps to Test:**
  1. **Test File Sharing:**
     - Go to `Settings` → `Local Backup`.
     - Tap **Create Backup**, then tap **Share**.
     - When the system share sheet / intent opens, stay on it for 5–10 seconds.
     - Dismiss the share sheet to return to Kaizen.
     - Verify the app returns to the screen **without** triggering the PIN lock screen during the grace window.
  2. **Test Photo Picker:**
     - Go to `Notes` or `Transactions` → Add/Edit Note or Transaction.
     - Tap **Add Attachment** → **Choose from Gallery / Photos**.
     - When the device photo gallery opens, select an image or tap cancel.
     - Verify Kaizen does not immediately lock upon returning from the gallery picker.
* **Expected Result:**
  * System intents (Share sheet, Image picker, Document picker) no longer falsely trigger app re-lock.

---

## 12. App Lock Gates on Version History & Developer Message

* **Where to go:**
  * App Lock active state.
* **Steps to Test:**
  1. Have App Lock enabled.
  2. Send app to background and let lock engage (or lock via security settings).
  3. Re-open the app on the PIN lock screen.
  4. Verify that neither the **Version History Modal** nor the **Developer Message Modal** appears or peeks in the background while the app is locked.
  5. Enter your PIN to unlock: verify any pending update modal only displays *after* successful authentication.
* **Expected Result:**
  * Financial data and app modals remain completely hidden behind the PIN/biometric screen until unlocked.

---

## 13. Developer Note Layout on Compact Screens

* **Where to go:**
  1. Go to **Settings** → **Developer Message** (or tap developer note).
* **Steps to Test:**
  1. Open the Developer Message modal.
  2. Inspect section titles, badges, and card borders.
  3. Verify titles do not wrap awkwardly or overlap card borders, even on smaller screen sizes.
* **Expected Result:**
  * Clean typography with proper padding inside container borders.

---

## Summary of Manual Testing Sign-Off

| Test Section | Tested By | Date | Pass / Fail | Notes |
|---|---|---|---|---|
| CSV Import Wizard | | | | |
| Advance Posting | | | | |
| Net Worth Tooltips | | | | |
| Credit Cards Statement Activities | | | | |
| Privacy Mode on Credit Cards | | | | |
| Walkthrough Header Docking | | | | |
| Unified Date Picker | | | | |
| Horizontal Scroll Arrows | | | | |
| Settings Terms of Service | | | | |
| Reset Confirmation (`RESET`) | | | | |
| App Lock Intent Grace Window | | | | |
| App Lock Modal Gates | | | | |

