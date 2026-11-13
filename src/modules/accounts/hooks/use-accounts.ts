import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getAccountsWithBalances } from "@/modules/accounts/services/get-accounts-with-balances.service";
import { getPocketsWithBalances } from "@/modules/accounts/services/get-pockets-with-balances.service";
import { listAccountTypes } from "@/modules/accounts/repositories/account-types.repository";
import { accountErrorMessage } from "@/modules/accounts/schemas/account.schema";
import type { AccountListItem, AccountType, PocketListItem } from "@/modules/accounts/types/account.types";
import { getCreditCardMonitoring } from "@/modules/credit-cards";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";

export type UseAccountsOptions = {
  /** When false, skips billing reconciliation during reads (faster for Home / Search). */
  includeCreditCardMonitoring?: boolean;
};

export function useAccounts(options?: UseAccountsOptions) {
  const includeCreditCardMonitoring = options?.includeCreditCardMonitoring !== false;
  const [data, setData] = useState<{
    accounts: AccountListItem[];
    pockets: PocketListItem[];
    types: AccountType[];
  }>({ accounts: [], pockets: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const refresh = useCallback(() => {
    runDeferredSyncQuery(
      {
        hasCachedResult: hasLoadedOnceRef.current,
        setLoading,
        onMarkLoaded: () => {
          hasLoadedOnceRef.current = true;
        },
      },
      () => {
        try {
          let accounts: AccountListItem[];
          if (includeCreditCardMonitoring) {
            const monitoring = getCreditCardMonitoring();
            const monitoringByAccountId = new Map(
              monitoring.cards.map((card) => [card.accountId, card]),
            );
            accounts = getAccountsWithBalances().map((account) => {
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
            accounts = getAccountsWithBalances().map((account) => ({
              ...account,
              creditCardMonitoring: null,
            }));
          }
          setData({
            accounts,
            pockets: getPocketsWithBalances(),
            types: listAccountTypes(),
          });
          setError(null);
        } catch (cause) {
          setError(accountErrorMessage(cause));
        }
      },
    );
  }, [includeCreditCardMonitoring]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  return { ...data, loading, error, refresh };
}
