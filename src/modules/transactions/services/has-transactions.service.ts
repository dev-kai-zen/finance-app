import { db, type DbContext } from "@/infrastructure/database/client";
import { hasTransactions as hasTransactionsRecord } from "../repositories/transactions.repository";

export function hasTransactions(context: DbContext = db): boolean {
  return hasTransactionsRecord(context);
}
