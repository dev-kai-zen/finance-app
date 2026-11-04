import { db, type DbContext } from "@/infrastructure/database/client";
import { calculateTransactionStats } from "../repositories/transactions.repository";

export function getTransactionCount(context: DbContext = db): number {
  return calculateTransactionStats(context).transactionCount;
}

