import { db, type DbContext } from "@/infrastructure/database/client";
import { listAllFilteredTransactions } from "../repositories/transactions.repository";
import type {
  TransactionListItem,
  TransactionPageFilter,
} from "../types/transaction.types";

/**
 * Returns the complete unpaginated list of active logical transactions matching
 * the active screen filter and sort order for full CSV exports.
 */
export function getTransactionsForExport(
  filter?: TransactionPageFilter,
  context: DbContext = db,
): TransactionListItem[] {
  return listAllFilteredTransactions(filter, context);
}
