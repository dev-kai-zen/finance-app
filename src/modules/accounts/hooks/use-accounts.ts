import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { listAccounts } from "@/modules/accounts/repositories/accounts.repository";
import { listAccountTypes } from "@/modules/accounts/repositories/account-types.repository";
import { accountErrorMessage } from "@/modules/accounts/schemas/account.schema";
import type { AccountListItem, AccountType } from "@/modules/accounts/types/account.types";

export function useAccounts() {
  const [data, setData] = useState<{ accounts: AccountListItem[]; types: AccountType[] }>({ accounts: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setLoading(true);
    try {
      setData({ accounts: listAccounts(), types: listAccountTypes() });
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
