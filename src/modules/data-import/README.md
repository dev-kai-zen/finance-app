# CSV import

Open **Settings → Import data** in the Android or iOS app, in a personal workspace.
Share a template or download it directly to a selected folder, or select a
CSV/TSV/UTF-8 text export. The header help button explains the import requirements.
Limits: 2 MiB and 1,000 data records per file. Quoted multiline text is supported.

The numbered wizard separates file formats/column matching, accounts, categories,
and review. Accounts-only imports omit the category step. Optional details include
the source app/bank label, with help explaining that no connection is established.
Help uses the standard app information modal. Date fields use the existing calendar;
account, account-type, and category fields adapt the existing public pickers without
changing their behavior. Forms and selectors use the app's keyboard-aware scroller.
Required/optional chips use solid red/orange with white text. Date format validation
checks the entire mapped column and shows its original and interpreted sample.

Review is a virtualized, searchable list grouped into Needs attention, Will be left
out, and Ready to import. Wide screens show compact table rows. Ready chips are
green with white text; previously imported rows stay in the excluded group.
Entry corrections use the standard form modal and remain draft changes until applied.
Applying a correction revalidates it; cancelling preserves the previous draft.
The original file is unchanged. Only the final Import records action writes records,
and it is enabled only when every included row is ready and at least one is accepted.

## Supported records

- Accounts: name, type, currency, opening balance, balance date, optional note.
- Income/expenses: date, amount, account, category, optional time, description,
  note, semicolon-separated labels, subcategory, original record ID.
- Same-currency transfers: one positive source/destination row, or two opposite
  signed rows with matching amounts, account pairs, and calendar dates. The times
  may differ. When destination columns are missing, only a unique opposite entry
  can supply the destination; ambiguous matches require review.
- Column matching supports separate debit/credit columns and explicit date and
  number formats. Standard type values are `income`, `expense`, `transfer`.
  Other labels need explicit type mappings or an explicit Leave out choice.
  Without a type column, signed amounts or debit/credit columns determine type.
  A review correction can override the type for an individual row.

Some required information can be supplied during matching instead of in the file.
Accounts without a source account column need a default account name. Category
names are matched by type, name, and parent. Unmatched names default to Other
Expense or Other Income; creating a category is an explicit draft choice.
New accounts require an existing
account type and an active currency. Credit-card accounts and cross-currency
records are excluded from this release.

Recognizable split, pocket, fee, foreign-currency, installment, and recurring
metadata is blocked for review. The importer cannot interpret arbitrary metadata
from every third-party export; review the mapped fields and source file carefully.
Import does not create budgets, goals, schedules, attachments, or installment plans.

## Balances and duplicate records

For transaction history, the opening balance is the amount immediately before
the imported history starts. For accounts only, it is the balance on the stated
date. Existing account opening balances are preserved. A transaction before its
account's opening date requires correction or exclusion.

Keep the same source app/bank name on future imports. Original IDs are scoped by
source, import kind, and source account name. Without an ID, a file digest and row
number identify exact repeat imports within that source/account scope. Previously
imported IDs remain excluded after record deletion. Similar purchases are flagged
using date, account, amount, description, and transfer destination; users decide
whether a similar purchase is legitimate. Existing records are never overwritten.

## Commit and recovery

The preview is read-only. Confirmation revalidates the draft, creates a local safety
backup, and checks the preview again inside a synchronous SQLite transaction.
Accounts, categories, labels, transactions, import history, and source references
commit together. Bulk transaction creation reconciles billing once. Existing Quick
Sync database listeners handle background synchronization after local changes.

Completed imports record counts, affected balances, excluded row numbers/reasons,
and record references. The history screen shows the latest 30 batches. Raw source
files are not persisted. File picker cache copies are discarded after reading.
Shared template copies remain in the app cache so receiving apps can read them
after the share dialog closes; each share uses a unique filename.

Restore a safety backup through Local Backup if necessary. Restoration replaces
the workspace, including later edits. Selective import undo is not included.

## Verification

Run `node --test src/modules/data-import/__tests__/*.test.cjs` and
`npx tsc --noEmit`. Commit tests use actual SQLite and production Drizzle services;
only native bridges and safety backup I/O are substituted. Test migration upgrades,
backup failure, stale previews, rollback, transfer pairs, labels, and reimports.

On a device, also check document selection/cancellation, template sharing, keyboard
access, native pickers, large text, back/discard behavior, background/resume, and
balances across Accounts, Dashboard, Reports, and Calendar after an import.
