import { db, type DbContext } from "@/infrastructure/database/client";
import { listTransactions } from "../repositories/transactions.repository";
import type { TransactionListItem } from "../types/transaction.types";

export function getCalendarMonthTransactions(
  startDate: Date,
  endDate: Date,
  context: DbContext = db,
): TransactionListItem[] {
  return listTransactions(
    {
      startDate,
      endDate,
      includeBalances: false,
    },
    context,
  );
}
