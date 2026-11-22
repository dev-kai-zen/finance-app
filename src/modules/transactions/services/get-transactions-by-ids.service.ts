import type { DbContext } from "@/infrastructure/database/client";
import { db } from "@/infrastructure/database/client";
import { findTransactionsByIds } from "../repositories/transactions.repository";
import type { Transaction } from "../types/transaction.types";

export function getTransactionsByIds(
  ids: string[],
  context: DbContext = db,
): Transaction[] {
  return findTransactionsByIds(ids, context);
}
