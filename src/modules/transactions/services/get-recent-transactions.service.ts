import { db, type DbContext } from "@/infrastructure/database/client";
import { listRecentTransactions } from "@/modules/transactions/repositories/transactions.repository";
import type { TransactionListItem } from "@/modules/transactions/types/transaction.types";

export function getRecentTransactions(
  limit = 5,
  context: DbContext = db,
): TransactionListItem[] {
  return listRecentTransactions(limit, context);
}
