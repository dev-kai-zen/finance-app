import { db, type DbContext } from "@/infrastructure/database/client";
import { hasTransactions as hasTransactionsRepo } from "../repositories/transactions.repository";

export function hasTransactions(context: DbContext = db): boolean {
  return hasTransactionsRepo(context);
}
