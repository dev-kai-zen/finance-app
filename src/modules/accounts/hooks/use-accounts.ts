import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getAccountsWithBalances } from "@/modules/accounts/services/get-accounts-with-balances.service";
import { getPocketsWithBalances } from "@/modules/accounts/services/get-pockets-with-balances.service";
import { listAccountTypes } from "@/modules/accounts/repositories/account-types.repository";
import { accountErrorMessage } from "@/modules/accounts/schemas/account.schema";
import type { AccountListItem, AccountType, PocketListItem } from "@/modules/accounts/types/account.types";
import { getCreditCardMonitoring } from "@/modules/credit-cards";

export function useAccounts() {
  const [data, setData] = useState<{
    accounts: AccountListItem[];
    pockets: PocketListItem[];
    types: AccountType[];
  }>({ accounts: [], pockets: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const refresh = useCallback(() => {
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    try {
      const monitoring = getCreditCardMonitoring();
      const monitoringByAccountId = new Map(
        monitoring.cards.map((card) => [card.accountId, card]),
      );
      const accounts = getAccountsWithBalances().map((account) => {
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
      setData({
        accounts,
        pockets: getPocketsWithBalances(),
        types: listAccountTypes(),
      });
      setError(null);
    } catch (cause) {
      setError(accountErrorMessage(cause));
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      const frameId = requestAnimationFrame(() => {
        refresh();
      });
      return () => cancelAnimationFrame(frameId);
    }, [refresh]),
  );
  return { ...data, loading, error, refresh };
}
