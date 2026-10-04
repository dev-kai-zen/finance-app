import { db, type DbContext } from "@/infrastructure/database/client";
import { getAccountBalanceDeltas } from "@/modules/transactions";
import { listAccounts } from "../repositories/accounts.repository";
import type { AccountListItem } from "../types/account.types";
import { getAccountIdsInUse } from "./can-delete-account.service";

/**
 * Retrieves all accounts combined with their dynamic current balances
 * computed from transaction history via the transactions service.
 *
 * @param context Optional database context or transaction handle
 * @returns List of accounts with live `currentBalanceMinorUnits`
 */
export function getAccountsWithBalances(
  context: DbContext = db,
): AccountListItem[] {
  const accounts = listAccounts(context);
  const deltas = getAccountBalanceDeltas(context);
  const inUseAccountIds = getAccountIdsInUse(context);

  return accounts.map((account) => {
    const delta = deltas[account.id] || 0;
    return {
      ...account,
      currentBalanceMinorUnits: account.openingBalanceMinorUnits + delta,
      isDeletable: !inUseAccountIds.has(account.id),
    };
  });
}
