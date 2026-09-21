import { db, type DbContext } from "@/infrastructure/database/client";
import { getPocketTransactionBalanceDeltas } from "@/modules/transactions/services/get-pocket-transaction-balance-deltas.service";
import { listPockets } from "@/modules/accounts/repositories/pockets.repository";
import type { PocketListItem } from "@/modules/accounts/types/account.types";

export function getPocketsWithBalances(context: DbContext = db): PocketListItem[] {
  const transactionDeltas = getPocketTransactionBalanceDeltas(context);
  return listPockets(context).map((pocket) => ({
    ...pocket,
    currentBalanceMinorUnits: transactionDeltas[pocket.id] ?? 0,
  }));
}

export function getAvailablePocketBalance(
  accountId: string,
  accountBalanceMinorUnits: number,
  context: DbContext = db,
): number {
  const allocated = getPocketsWithBalances(context)
    .filter((pocket) => pocket.accountId === accountId)
    .reduce((sum, pocket) => sum + pocket.currentBalanceMinorUnits, 0);
  return accountBalanceMinorUnits - allocated;
}
