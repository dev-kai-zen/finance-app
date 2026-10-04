import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getAccountIdsWithTransactions,
  hasTransactionsForAccount,
} from "../repositories/transactions.repository";
import {
  getAccountIdsWithPresets,
  hasPresetsForAccount,
} from "../repositories/transaction-presets.repository";

export function isAccountInUseByTransactions(
  accountId: string,
  context: DbContext = db,
): boolean {
  return (
    hasTransactionsForAccount(accountId, context) ||
    hasPresetsForAccount(accountId, context)
  );
}

export function getAccountIdsInUseByTransactions(
  context: DbContext = db,
): Set<string> {
  const transactionAccountIds = getAccountIdsWithTransactions(context);
  const presetAccountIds = getAccountIdsWithPresets(context);
  const combined = new Set(transactionAccountIds);
  for (const id of presetAccountIds) {
    combined.add(id);
  }
  return combined;
}
