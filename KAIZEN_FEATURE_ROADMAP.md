# Kaizen Feature Integration Roadmap & Schema Reassessment

> **Superseded for implementation decisions.** Use [`FEATURES_INTEGRATION.md`](./FEATURES_INTEGRATION.md) as the 1-by-1 playbook. This file is kept as historical context. Several recommendations here are outdated — especially Feature 3 transfers (`transfer_account_id` was replaced by dual-leg rows + `transaction_group_id`) and the “Accounts is the next step” note (accounts, categories, and the core ledger are already live).

## Purpose & Migration Philosophy

This roadmap defines the step-by-step strategy for recreating features from the legacy **Kaizen Finance app** (`kaizen-finance-app`) inside our refactored **Finance app** (`finance-app`).

### Why Avoid a "Big-Bang" Migration?

The original Kaizen Finance app accumulated significant technical debt and stability bugs that stemmed from:
1. **Monolithic Table Design**: Tables such as `accounts` had over 32 columns combining generic bank accounts, credit card billing cycles, loan schedules, presentation flags, and sync metadata into a single record.
2. **Transfer Ledger Inconsistencies**: Transfers were modeled simultaneously with `fromAccountId` / `toAccountId` columns AND paired dual records via `transferPairId`, leading to duplicate debit/credit bugs and desynchronized balances.
3. **Date/Time String Glitches**: Dates (`YYYY-MM-DD`) and times (`HH:MM`) were stored as separate text strings, resulting in sorting errors, timezone desync, and complex string parsing in queries.
4. **Hardcoded Presentation Values**: Raw hex color codes (e.g. `'#2E9A58'`) and icon names were baked directly into database default values.
5. **State & Architecture Duplication**: State was fragmented across SQLite, Zustand stores, React Query caches, and local component states without single-source-of-truth guarantees.

To build a rock-solid, production-grade application, we migrate **feature-by-feature** following the strict architecture defined in [`AGENTS.md`](file:///c:/expo-app/finance-app/AGENTS.md):
- Every table schema is reassessed and normalized prior to implementation.
- All monetary amounts use integer minor units (centavos in `PHP`) to eliminate floating-point math errors.
- All timestamps use Unix milliseconds integers (`timestamp_ms`).
- Strict separation between **Mutations** (Screen → Hook → Service → Repository → SQLite Transaction) and **Queries** (Screen → Hook → Repository → SQLite).
- Strict semantic theme tokens exclusively (no raw hex colors).

---

## Architectural Comparison Matrix

| Area | Legacy Kaizen Finance App | New Finance App (`finance-app`) |
| :--- | :--- | :--- |
| **Framework** | Expo (Mixed SDKs / Custom) | Expo SDK 57 + Expo Router + TypeScript |
| **Database** | `expo-sqlite` with uncoordinated queries | `expo-sqlite` + `drizzle-orm` with centralized client |
| **Financial Units** | Inconsistent integers/floats across tables | Strict integer minor units (`amountMinorUnits`, `PHP`) |
| **Dates/Times** | String pairs (`date: text`, `time: text`) | Unified integer timestamps (`timestamp_ms`) |
| **Theme System** | Hardcoded hex strings and ad-hoc CSS | Strict semantic theme tokens (`useAppTheme`, `useThemeStyles`) |
| **Navigation** | Scattered top-level tabs and nested modals | Expo Router thin routes with responsive `AppShell` (desktop sidebar / mobile drawer) |
| **Write Integrity** | Direct repository/component SQL execution | Atomic business services using `db.transaction(...)` |
| **Soft Delete** | `deleted_at: text` columns causing broken FKs | Dedicated audit/trash state or status enum without orphaned FKs |

---

## Phased Feature Integration Roadmap

```mermaid
graph TD
  subgraph Phase 0.5: Visual Foundation
    F0[0. Theme Presets & Switcher ✅] --> F1
  end

  subgraph Phase 1: Core Financial Foundation
    F1[1. Accounts Management] --> F2[2. Categories Management]
    F2 --> F3[3. Transaction Ledger & Transfers]
    F3 --> F4[4. Interactive Live Dashboard]
  end

  subgraph Phase 2: Organization & Safety
    F3 --> F5[5. Labels & Tags]
    F3 --> F6[6. Split Transactions]
    F3 --> F7[7. Financial Calendar View]
    F3 --> F8[8. Trash & Soft-Delete System]
  end

  subgraph Phase 3: Financial Planning & Control
    F2 --> F9[9. Category Budgets]
    F1 --> F10[10. Financial Goals & Targets]
    F3 --> F11[11. Recurring Transactions & Scheduled Bills]
    F1 --> F12[12. Credit Card & Debt Management]
  end

  subgraph Phase 4: Analytics, Search & Offline Sync
    F3 --> F13[13. Financial Reports & Cash Flow]
    F3 --> F14[14. Global Full-Text Search FTS5]
    F1 --> F15[15. Data Backup & Remote Sync Engine]
  end
```

---

## Detailed Feature Specifications & Schema Reassessment

### Feature 0: Theme Presets & Switcher (Completed ✅)
- **Design/UX**: Six signature Kaizen palettes (**Kaizen Light**, **Kaizen Emerald**, **Cyber Azure**, **Amethyst Glow**, **Sunset Amber**, **Crimson Obsidian**). Interactive palette selector in Settings with dual-swatch preview cards and instant global theme switching.
- **Legacy Kaizen Flaws**:
  - Mutable `Object.assign` global color mutation without React lifecycle reactivity.
  - Required app restart or re-mounting for some screens to update styles.
- **Finance App Architecture**:
  - Constants: [`src/constants/theme/presets.ts`](file:///c:/expo-app/finance-app/src/constants/theme/presets.ts)
  - Provider: [`src/components/theme/app-theme-provider.tsx`](file:///c:/expo-app/finance-app/src/components/theme/app-theme-provider.tsx)
  - Hooks: `useAppTheme()`, `useThemeStyles()`, `useThemeController()`
  - UI: Interactive selector on [`SettingsScreen`](file:///c:/expo-app/finance-app/src/modules/settings/screens/settings-screen.tsx).
- **Table Schema Reassessment**:
  - Presets are pure typed code constants. Zero database coupling per architecture guidelines.

### Feature 1: Accounts Management (CRUD, Groups, Types & Archival)
- **Design/UX**: Asset and liability grouping, account type color badges (`categorical`), active vs. archived toggles, balance cards, account creation and edit modals.
- **Legacy Kaizen Flaws**:
  - `accounts` table had 32 columns. Credit card fields (`creditLimit`, `paymentDueDay`) and loan fields (`interestRate`, `principalAmount`) were mixed into basic cash/checking accounts.
  - Hardcoded default color `'#2E9A58'` and default icon `'landmark'` in database schema.
  - Dates stored as strings (`opening_date: text`, `created_at: text`).
- **Finance App Architecture**:
  - Screen: `src/modules/accounts/screens/accounts-screen.tsx`
  - Components: `AccountCard`, `AccountFormModal`, `AccountTypePicker`, `ArchivedAccountsSection`
  - Hooks: `useAccounts()`, `useAccountTypes()`, `useAccountMutations()`
  - Services: `create-account.service.ts`, `update-account.service.ts`, `archive-account.service.ts`, `delete-account-type.service.ts`
  - Repositories: `accounts.repository.ts`, `account-types.repository.ts`
  - Validation: `src/modules/accounts/schemas/account.schema.ts` (Zod)
- **Table Schema Reassessment**:
  - `account_types`: `id`, `name`, `account_group` (`'asset'` | `'liability'`), `icon_key`, `color`, `is_system`, `is_archived`, `sort_order`, `created_at`, `updated_at`.
  - `accounts`: `id`, `account_type_id` (FK restrict), `name`, `currency_code` (e.g. `'PHP'`), `opening_balance_minor_units` (integer), `opening_balance_at` (`timestamp_ms`), `is_archived` (boolean), `sort_order`, `created_at`, `updated_at`.
  - *Discarded from legacy*: Remove 20+ loan/credit card columns from `accounts`. When credit card/loan management is built in Feature 12, isolate them in dedicated extension tables (e.g. `credit_card_details`).

---

### Feature 2: Categories Management (Income, Expense & Categorical Colors)
- **Design/UX**: Income and expense category grids, hierarchical category trees, theme-driven categorical color chips, icon selection, system categories vs. user-defined categories.
- **Legacy Kaizen Flaws**:
  - `icon` and `color` stored as arbitrary hex values with no typed relationship to the design system.
  - Reassigning category before deletion was missing or caused orphaned transactions.
- **Finance App Architecture**:
  - Screen: `src/modules/categories/screens/categories-screen.tsx`
  - Components: `CategoryList`, `CategoryFormModal`, `CategoryColorPicker`
  - Hooks: `useCategories()`, `useCategoryMutations()`
  - Services: `create-category.service.ts`, `update-category.service.ts`, `delete-category.service.ts` (with reassignment)
  - Repositories: `categories.repository.ts`
  - Validation: `src/modules/categories/schemas/category.schema.ts`
- **Table Schema Reassessment**:
  - Current schema: `categories` table with `id`, `name`, `type` (`'income'` | `'expense'`), `color`, `icon`, `is_system`, `created_at`, `updated_at`.
  - *Reassessment additions*:
    - Add `parent_id` (nullable FK to `categories.id` with `onDelete: 'cascade'`) to support subcategories cleanly.
    - Add `sort_order` (integer default 0) for user-controlled category ordering.

---

### Feature 3: Core Transaction Ledger (Income, Expense, Transfers)
- **Design/UX**: Quick transaction entry, type toggle (Expense, Income, Transfer), source account selector, destination account selector (for transfers), category picker, notes, and date-time picker.
- **Legacy Kaizen Flaws**:
  - Separate `date: text` (`YYYY-MM-DD`) and `time: text` (`HH:MM`) columns caused timestamp collation errors and timezone glitches.
  - Multi-column transfer nightmare: had `accountId`, `pocketId`, `fromAccountId`, `toAccountId`, and `transferPairId`. Transfer queries frequently double-counted debits.
  - Amounts were sometimes stored as signed negatives and sometimes as positive numbers with type flags.
- **Finance App Architecture**:
  - Screen: `src/modules/transactions/screens/transactions-screen.tsx`
  - Components: `TransactionRow`, `TransactionFormModal`, `TransferFormModal`, `TransactionFilters`
  - Hooks: `useTransactions()`, `useTransactionMutations()`
  - Services: `create-transaction.service.ts`, `create-transfer.service.ts`, `update-transaction.service.ts`, `delete-transaction.service.ts`
  - Repositories: `transactions-read.repository.ts`, `transactions-write.repository.ts`
  - Validation: `src/modules/transactions/schemas/transaction.schema.ts`
- **Table Schema Reassessment**:
  - Keep `amount_cents` strictly positive minor units (integer); direction is governed by `type`.
  - Unify `occurred_at` as integer `timestamp_ms`.
  - Clean transfer model: A transfer is an atomic operation with `type = 'transfer'`, `account_id` (source debit), and `transfer_account_id` (destination credit). Single-record representation ensures no orphaned half-transfers or desynchronized pair IDs.

---

### Feature 4: Interactive Live Dashboard
- **Design/UX**: Total Net Worth hero card, Asset vs. Liability summary bar, high-level Accounts snapshot cards, Recent activity feed, and Quick Action buttons (+ Transaction, Transfer, + Account).
- **Legacy Kaizen Flaws**:
  - Polled the entire database on every render via Zustand, recalculating net worth in Javascript rather than utilizing indexed SQLite sum aggregations.
- **Finance App Architecture**:
  - Screen: `src/modules/dashboard/screens/dashboard-screen.tsx`
  - Components: `NetWorthCard`, `AccountsSnapshotGrid`, `RecentTransactionsFeed`, `QuickActionRow`
  - Hooks: `useDashboardSummary()`, `useRecentTransactions()`
  - Repositories: Direct read queries via `accounts.repository.ts` and `transactions-read.repository.ts`
  - Validation: None (pure read query flow consistent with `AGENTS.md`)
- **Table Schema Reassessment**:
  - Add composite index on `transactions(occurred_at, account_id)` and `accounts(is_archived, sort_order)` to make dashboard summary queries sub-millisecond.

---

### Feature 5: Labels & Tags System
- **Design/UX**: Many-to-many tags on transactions (e.g. `#tax-deductible`, `#vacation-2026`, `#reimbursable`), tag filtering on transaction screens, tag management screen in settings.
- **Legacy Kaizen Flaws**:
  - Cascade deletes on labels frequently locked the SQLite database due to missing foreign key indices on the join table.
- **Finance App Architecture**:
  - Module: `src/modules/labels/`
  - Repositories: `labels.repository.ts`
  - Services: `create-label.service.ts`, `delete-label.service.ts`
- **Table Schema Reassessment**:
  - `labels`: `id`, `name`, `color`, `created_at`, `updated_at`.
  - `transaction_labels`: `transaction_id` (FK cascade), `label_id` (FK cascade). Composite primary key `(transaction_id, label_id)` + index on `label_id`.

---

### Feature 6: Split Transactions
- **Design/UX**: Splitting a single receipt or payment across multiple categories (e.g., SM Mall purchase: ₱3,500 Groceries, ₱1,200 Apparel).
- **Legacy Kaizen Flaws**:
  - Split transactions stored duplicate parent transactions and lacked validation checking that child entries equaled the parent total amount.
- **Finance App Architecture**:
  - Service: `create-split-transaction.service.ts` validates `sum(child_entries) === parent_amount` inside a `db.transaction(...)`.
- **Table Schema Reassessment**:
  - `transaction_entries`: `id`, `transaction_id` (FK cascade), `category_id` (FK restrict), `amount_cents` (integer), `note`, `created_at`, `updated_at`.
  - Add `is_split` boolean flag on parent `transactions` table.

---

### Feature 7: Financial Calendar View
- **Design/UX**: Month grid with daily indicator dots representing income and expense volume; selecting a day reveals that day's transaction audit list and daily balance change.
- **Legacy Kaizen Flaws**:
  - Queried day-by-day strings (`WHERE date = '2026-08-15'`), resulting in 31 individual queries per month view!
- **Finance App Architecture**:
  - Screen: `src/modules/calendar/screens/calendar-screen.tsx`
  - Repository: Single month-range aggregation query: `WHERE occurred_at >= startOfMonth AND occurred_at <= endOfMonth GROUP BY strftime(...)`.

---

### Feature 8: Trash & Soft-Delete Recovery System
- **Design/UX**: Trashing accounts, categories, or transactions moves them to a Trash bin. Users can review deleted items, restore them, or permanently purge them.
- **Legacy Kaizen Flaws**:
  - Restoring a transaction whose parent account was deleted threw foreign key constraint crashes.
- **Finance App Architecture**:
  - Service: `restore-item.service.ts` checks parent record existence prior to restoration.
- **Table Schema Reassessment**:
  - Avoid adding `deleted_at` to every table. Use a clean `trash` log or explicit status enum (`status = 'active' | 'trashed'`) with dedicated indices to exclude trashed records from normal queries.

---

### Feature 9: Budgets & Spending Limits
- **Design/UX**: Monthly category budgets, progress bars showing percent spent, remaining budget calculations, optional rollover from previous periods.
- **Legacy Kaizen Flaws**:
  - Monolithic join across fund groups, pockets, and accounts created confusing budget balances.
- **Finance App Architecture**:
  - Module: `src/modules/budgets/`
  - Tables: `budgets` (period, start_date, end_date, rollover_enabled), `budget_items` (budget_id, category_id, limit_cents).

---

### Feature 10: Financial Goals & Target Savings
- **Design/UX**: Target amount, target completion date, linked dedicated savings account, progress percentage, milestone alerts.
- **Legacy Kaizen Flaws**:
  - Goals were tightly coupled to "Pockets" (a concept that had ambiguous boundaries with sub-accounts).
- **Finance App Architecture**:
  - Table: `goals`: `id`, `name`, `target_amount_cents`, `account_id` (FK), `target_date` (`timestamp_ms`), `is_completed`, `created_at`, `updated_at`.

---

### Feature 11: Recurring Transactions & Scheduled Reminders
- **Design/UX**: Repeating bills and income (frequency: daily, weekly, monthly, annual), auto-generation of transactions upon occurrence, or pending approval prompt.
- **Legacy Kaizen Flaws**:
  - Background task frequently generated duplicate recurring transactions if the app was reopened multiple times on the scheduled day.
- **Finance App Architecture**:
  - Table: `recurring_templates`: `id`, `account_id`, `category_id`, `amount_cents`, `frequency`, `interval`, `next_run_at`, `last_run_at`, `is_active`.
  - Service: `process-due-recurring.service.ts` uses idempotent date comparisons (`last_run_at`) inside a database transaction.

---

### Feature 12: Credit Card & Debt Management
- **Design/UX**: Statement balance tracking, credit limit utilization bar, billing cycle start day, payment due date countdown, payoff calculators.
- **Finance App Architecture**:
  - Dedicated child table: `credit_card_details`: `account_id` (PK / FK), `credit_limit_cents`, `statement_day`, `due_day`, `interest_rate_basis_points`.
  - Keeps core `accounts` table lean and normalized.

---

### Feature 13: Financial Reports & Cash Flow
- **Design/UX**: Net worth progression chart, income vs. expense monthly breakdown, category distribution pie/bar charts, cash flow statements.
- **Finance App Architecture**:
  - Module: `src/modules/reports/`
  - Pure SQL aggregation queries calculating monthly sums and categorical percentages without fetching raw transaction rows into Javascript memory.

---

### Feature 14: Global Search (FTS5)
- **Design/UX**: Fast search across transaction notes, payee descriptions, categories, and account names.
- **Finance App Architecture**:
  - SQLite `FTS5` virtual table with triggers on `transactions` insert/update/delete.

---

### Feature 15: Data Backup & Remote Sync Engine
- **Design/UX**: Full offline JSON / SQLite backup export and import, preparation for background Google Drive sync.
- **Finance App Architecture**:
  - Located in `src/infrastructure/sync/` per `AGENTS.md`.
  - Mutation outbox queue stored locally in SQLite; UI never awaits remote network requests.

---

## Recommended Immediate Next Step

Begin with **Feature 1: Accounts Management Implementation**:
1. Connect the newly created `AccountsScreen` UI to the existing `accounts.repository.ts` and `account-types.repository.ts`.
2. Implement `create-account.service.ts` and `archive-account.service.ts` to allow users to create and manage their accounts.
3. Validate inputs via Zod schema (`src/modules/accounts/schemas/account.schema.ts`).
4. Replace presentational mock data with reactive local SQLite queries.
