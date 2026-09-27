import type { DbContext } from "@/infrastructure/database/client";
import { db } from "@/infrastructure/database/client";
import { listLedgerTransactionsForAccount } from "../repositories/transactions.repository";

export function getAccountLedgerTransactions(
  accountId: string,
  context: DbContext = db,
  options: { includeDeleted?: boolean } = {},
) {
  return listLedgerTransactionsForAccount(accountId, context, options);
}
