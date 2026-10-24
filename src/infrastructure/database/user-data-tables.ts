import { getTableName } from "drizzle-orm";

import {
  accountTypes,
  accounts,
  budgetMonthlyTargets,
  categories,
  categoryBudgets,
  creditCardDetails,
  creditCardInstallmentPlans,
  creditCardInstallments,
  creditCardStatementEntries,
  creditCardStatements,
  currencies,
  exchangeRates,
  fundGroupAccounts,
  fundGroupPockets,
  fundGroups,
  goalAccounts,
  goalPockets,
  goals,
  hexColors,
  labels,
  noteAttachments,
  notes,
  pockets,
  settings,
  transactionAttachments,
  transactionEntries,
  transactionLabels,
  transactionPresets,
  transactionScheduleOccurrences,
  transactionSchedulePostings,
  transactionSchedules,
  transactions,
} from "./schema";

/**
 * SQLite user-data tables cleared by `deleteAllUserData` (excluding `sync_operations`).
 * Keep in sync with `src/modules/settings/repositories/reset-data.repository.ts`.
 */
const APP_RESET_USER_DATA_TABLES = [
  transactionSchedulePostings,
  transactionScheduleOccurrences,
  transactionSchedules,
  transactionAttachments,
  transactionLabels,
  creditCardStatementEntries,
  creditCardInstallments,
  creditCardInstallmentPlans,
  creditCardStatements,
  transactionPresets,
  transactions,
  goalAccounts,
  goalPockets,
  goals,
  budgetMonthlyTargets,
  categoryBudgets,
  fundGroupAccounts,
  fundGroupPockets,
  fundGroups,
  creditCardDetails,
  pockets,
  accounts,
  noteAttachments,
  notes,
  labels,
  exchangeRates,
  settings,
  accountTypes,
  categories,
  hexColors,
] as const;

/**
 * User-owned data tables included in backup scope and reset flows.
 * Superset of {@link APP_RESET_USER_DATA_TABLE_NAMES} (e.g. split entries, currencies).
 * Auto-sync listens via {@link QUICK_SYNC_WATCHED_TABLE_NAMES} (settings excluded).
 */
const USER_DATA_TABLES = [
  ...APP_RESET_USER_DATA_TABLES,
  currencies,
  transactionEntries,
] as const;

export const APP_RESET_USER_DATA_TABLE_NAMES = APP_RESET_USER_DATA_TABLES.map(
  (table) => getTableName(table),
);

export const USER_DATA_TABLE_NAMES = USER_DATA_TABLES.map((table) =>
  getTableName(table),
);

/**
 * Tables Quick Sync listens to via `addDatabaseChangeListener`.
 * Excludes `settings` so widget snapshots and Quick Sync metadata writes do not
 * run SQLite reads inside the update hook (see regression at 7f5cf17).
 */
const SETTINGS_TABLE_NAME = getTableName(settings);

export const QUICK_SYNC_WATCHED_TABLE_NAMES = USER_DATA_TABLE_NAMES.filter(
  (name) => name !== SETTINGS_TABLE_NAME,
);

export const QUICK_SYNC_WATCHED_TABLE_NAME_SET = new Set<string>(
  QUICK_SYNC_WATCHED_TABLE_NAMES,
);

export const USER_DATA_TABLE_NAME_SET = new Set<string>(USER_DATA_TABLE_NAMES);
