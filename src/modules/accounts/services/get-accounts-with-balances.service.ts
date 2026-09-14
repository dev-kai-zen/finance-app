import { db, type DbContext } from "@/infrastructure/database/client";
import { getAccountBalanceDeltas } from "@/modules/transactions/services/get-account-balance-deltas.service";
import { listAccounts } from "../repositories/accounts.repository";
import type { AccountListItem } from "../types/account.types";

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

  return accounts.map((account) => {
    const delta = deltas[account.id] || 0;
    return {
      ...account,
      currentBalanceMinorUnits: account.openingBalanceMinorUnits + delta,
    };
  });
}
