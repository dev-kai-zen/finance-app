import { db, type DbContext } from "@/infrastructure/database/client";
import { listTransactions } from "@/modules/transactions/repositories/transactions.repository";
import type { TransactionListItem } from "@/modules/transactions/types/transaction.types";

export function getRecentTransactions(
  limit = 5,
  context: DbContext = db,
): TransactionListItem[] {
  return listTransactions(undefined, context).slice(0, Math.max(0, limit));
}
