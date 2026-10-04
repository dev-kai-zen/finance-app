import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getAccountIdsInUseByTransactions,
  isAccountInUseByTransactions,
} from "@/modules/transactions";
import {
  getAccountIdsWithSchedules,
  hasSchedulesForAccount,
} from "@/modules/scheduled-transactions";

export function isAccountInUse(
  accountId: string,
  context: DbContext = db,
): boolean {
  return (
    isAccountInUseByTransactions(accountId, context) ||
    hasSchedulesForAccount(accountId, context)
  );
}

export function canDeleteAccount(
  accountId: string,
  context: DbContext = db,
): boolean {
  return !isAccountInUse(accountId, context);
}

export function getAccountIdsInUse(context: DbContext = db): Set<string> {
  const transactionAccounts = getAccountIdsInUseByTransactions(context);
  const scheduledAccounts = getAccountIdsWithSchedules(context);
  const inUse = new Set(transactionAccounts);
  for (const id of scheduledAccounts) {
    inUse.add(id);
  }
  return inUse;
}
