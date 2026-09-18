import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getAccountsWithBalances } from "@/modules/accounts/services/get-accounts-with-balances.service";
import { getPocketsWithBalances } from "@/modules/accounts/services/get-pockets-with-balances.service";
import { listAccountTypes } from "@/modules/accounts/repositories/account-types.repository";
import { accountErrorMessage } from "@/modules/accounts/schemas/account.schema";
import type { AccountListItem, AccountType, PocketListItem } from "@/modules/accounts/types/account.types";

export function useAccounts() {
  const [data, setData] = useState<{
    accounts: AccountListItem[];
    pockets: PocketListItem[];
    types: AccountType[];
  }>({ accounts: [], pockets: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setLoading(true);
    try {
      setData({
        accounts: getAccountsWithBalances(),
        pockets: getPocketsWithBalances(),
        types: listAccountTypes(),
      });
      setError(null);
    } catch (cause) {
      setError(accountErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  return { ...data, loading, error, refresh };
}
