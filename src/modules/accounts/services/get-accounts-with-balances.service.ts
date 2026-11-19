import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getAccountBalanceDeltas,
  getAccountIdsWithTransactionHistory,
} from "@/modules/transactions";
import { listAccounts } from "../repositories/accounts.repository";
import type { AccountListItem } from "../types/account.types";
import { getAccountIdsInUse } from "./can-delete-account.service";

export interface GetAccountsWithBalancesOptions {
  /**
   * When false, skips computing `isDeletable` and `canChangeCurrency` management flags,
   * avoiding distinct transaction & schedule scans for picker/selection consumers.
   * Defaults to true to preserve existing management behavior.
   */
  includeManagementFlags?: boolean;
}

/**
 * Retrieves all accounts combined with their dynamic current balances
 * computed from transaction history via the transactions service.
 *
 * @param context Optional database context or transaction handle
 * @param options Optional flags to skip management-only queries for lightweight consumers
 * @returns List of accounts with live `currentBalanceMinorUnits`
 */
export function getAccountsWithBalances(
  context: DbContext = db,
  options?: GetAccountsWithBalancesOptions,
): AccountListItem[] {
  const includeManagementFlags = options?.includeManagementFlags ?? true;
  const accounts = listAccounts(context);
  const deltas = getAccountBalanceDeltas(context);

  if (!includeManagementFlags) {
    return accounts.map((account) => ({
      ...account,
      currentBalanceMinorUnits:
        account.openingBalanceMinorUnits + (deltas[account.id] || 0),
    }));
  }

  const accountsWithTransactions = getAccountIdsWithTransactionHistory(context);
  const inUseAccountIds = getAccountIdsInUse(context, accountsWithTransactions);

  return accounts.map((account) => {
    const delta = deltas[account.id] || 0;
    return {
      ...account,
      currentBalanceMinorUnits: account.openingBalanceMinorUnits + delta,
      isDeletable: !inUseAccountIds.has(account.id),
      canChangeCurrency: !accountsWithTransactions.has(account.id),
    };
  });
}
