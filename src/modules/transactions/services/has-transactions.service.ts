import { db, type DbContext } from "@/infrastructure/database/client";
import { hasTransactions as hasTransactionsQuery } from "@/infrastructure/database/queries/transaction-presence";

export function hasTransactions(context: DbContext = db): boolean {
  return hasTransactionsQuery(context);
}
