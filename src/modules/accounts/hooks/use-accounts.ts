import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getAccountsWithBalances } from "@/modules/accounts/services/get-accounts-with-balances.service";
import { getPocketsWithBalances } from "@/modules/accounts/services/get-pockets-with-balances.service";
import { listAccountTypes } from "@/modules/accounts/repositories/account-types.repository";
import { accountErrorMessage } from "@/modules/accounts/schemas/account.schema";
import type { AccountListItem, AccountType, PocketListItem } from "@/modules/accounts/types/account.types";
import { getCreditCardMonitoring } from "@/modules/credit-cards";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";

export type UseAccountsOptions = {
  skipQuery?: boolean;
  /**
   * When true, calculates detailed credit card monitoring (statements, billing cycles, utilization).
   * Defaults to false so selectors, pickers, and modals remain fast and lightweight.
   */
  includeCreditCardMonitoring?: boolean;
  /**
   * When true, computes `isDeletable` and `canChangeCurrency` management flags.
   * Defaults to matching `includeCreditCardMonitoring` so pickers skip management-only scans.
   */
  includeManagementFlags?: boolean;
};

export function useAccounts(options?: UseAccountsOptions) {
  const skipQuery = options?.skipQuery ?? false;
  const includeCreditCardMonitoring = options?.includeCreditCardMonitoring === true;
  const includeManagementFlags =
    options?.includeManagementFlags ?? includeCreditCardMonitoring;
  const [data, setData] = useState<{
    accounts: AccountListItem[];
    pockets: PocketListItem[];
    types: AccountType[];
  }>({ accounts: [], pockets: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const cancelPendingRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => {
    cancelPendingRef.current?.();
    if (skipQuery) return;
    cancelPendingRef.current = runDeferredSyncQuery(
      {
        hasCachedResult: hasLoadedOnceRef.current,
        setLoading,
        onMarkLoaded: () => {
          hasLoadedOnceRef.current = true;
        },
      },
      () => {
        cancelPendingRef.current = null;
        try {
          const baseAccounts = getAccountsWithBalances(undefined, {
            includeManagementFlags,
          });
          let accounts: AccountListItem[];
          if (includeCreditCardMonitoring) {
            const monitoring = getCreditCardMonitoring(undefined, baseAccounts);
            const monitoringByAccountId = new Map(
              monitoring.cards.map((card) => [card.accountId, card]),
            );
            accounts = baseAccounts.map((account) => {
              const card = monitoringByAccountId.get(account.id);
              return {
                ...account,
                creditCardMonitoring: card
                  ? {
                      billedMinorUnits: card.billedMinorUnits,
                      unbilledMinorUnits: card.unbilledMinorUnits,
                      outstandingMinorUnits: card.outstandingMinorUnits,
                      utilizationPercent: card.utilizationPercent,
                    }
                  : null,
              };
            });
          } else {
            accounts = baseAccounts.map((account) => ({
              ...account,
              creditCardMonitoring: null,
            }));
          }
          setData({
            accounts,
            pockets: getPocketsWithBalances(undefined, {
              includeManagementFlags,
            }),
            types: listAccountTypes(),
          });
          setError(null);
        } catch (cause) {
          setError(accountErrorMessage(cause));
        }
      },
    );
  }, [includeCreditCardMonitoring, includeManagementFlags, skipQuery]);
  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => {
        cancelPendingRef.current?.();
        cancelPendingRef.current = null;
      };
    }, [refresh]),
  );
  useEffect(() => {
    if (!skipQuery) {
      refresh();
    }
  }, [refresh, skipQuery]);
  return { ...data, loading, error, refresh };
}
