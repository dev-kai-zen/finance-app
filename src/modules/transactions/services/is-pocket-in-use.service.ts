import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getPocketIdsWithPresets,
  hasPresetsForPocket,
} from "../repositories/transaction-presets.repository";
import {
  getPocketIdsWithTransactions,
  hasTransactionsForPocket,
} from "../repositories/transactions.repository";

export function hasTransactionHistoryForPocket(
  pocketId: string,
  context: DbContext = db,
): boolean {
  return hasTransactionsForPocket(pocketId, context);
}

export function isPocketInUseByTransactions(
  pocketId: string,
  context: DbContext = db,
): boolean {
  return (
    hasTransactionHistoryForPocket(pocketId, context) ||
    hasPresetsForPocket(pocketId, context)
  );
}

export function getPocketIdsInUseByTransactions(
  context: DbContext = db,
): Set<string> {
  const transactionPocketIds = getPocketIdsWithTransactions(context);
  const presetPocketIds = getPocketIdsWithPresets(context);
  const combined = new Set(transactionPocketIds);
  for (const id of presetPocketIds) {
    combined.add(id);
  }
  return combined;
}
