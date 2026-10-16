import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { resolveAccountLocation } from "@/modules/accounts";
import {
  getDefaultAccounts,
  setDefaultExpenseAccount,
  setDefaultIncomeAccount,
  subscribeToDefaultAccounts,
  type DefaultAccountsConfig,
} from "../services/default-accounts.service";

export function useDefaultAccounts() {
  const [defaults, setDefaults] = useState<DefaultAccountsConfig>(() => {
    try {
      return getDefaultAccounts();
    } catch {
      return {
        defaultExpenseAccountId: null,
        defaultExpensePocketId: null,
        defaultIncomeAccountId: null,
        defaultIncomePocketId: null,
      };
    }
  });

  const refresh = useCallback(() => {
    try {
      setDefaults(getDefaultAccounts());
    } catch {
      // Ignore read errors during DB transitions
    }
  }, []);

  useEffect(() => {
    return subscribeToDefaultAccounts(refresh);
  }, [refresh]);

  const [displayRevision, setDisplayRevision] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refresh();
      setDisplayRevision((value) => value + 1);
    }, [refresh]),
  );

  const expenseLocation = useMemo(
    () =>
      resolveAccountLocation(
        defaults.defaultExpenseAccountId,
        defaults.defaultExpensePocketId,
      ),
    [
      defaults.defaultExpenseAccountId,
      defaults.defaultExpensePocketId,
      displayRevision,
    ],
  );

  const incomeLocation = useMemo(
    () =>
      resolveAccountLocation(
        defaults.defaultIncomeAccountId,
        defaults.defaultIncomePocketId,
      ),
    [
      defaults.defaultIncomeAccountId,
      defaults.defaultIncomePocketId,
      displayRevision,
    ],
  );

  const setExpenseAccount = useCallback(
    (accountId: string | null, pocketId: string | null = null) => {
      setDefaultExpenseAccount(accountId, pocketId);
      setDefaults((prev) => ({
        ...prev,
        defaultExpenseAccountId: accountId,
        defaultExpensePocketId: accountId ? pocketId : null,
      }));
    },
    [],
  );

  const setIncomeAccount = useCallback(
    (accountId: string | null, pocketId: string | null = null) => {
      setDefaultIncomeAccount(accountId, pocketId);
      setDefaults((prev) => ({
        ...prev,
        defaultIncomeAccountId: accountId,
        defaultIncomePocketId: accountId ? pocketId : null,
      }));
    },
    [],
  );

  return {
    defaultExpenseAccountId: defaults.defaultExpenseAccountId,
    defaultExpensePocketId: defaults.defaultExpensePocketId,
    defaultIncomeAccountId: defaults.defaultIncomeAccountId,
    defaultIncomePocketId: defaults.defaultIncomePocketId,
    expenseLocation,
    incomeLocation,
    setExpenseAccount,
    setIncomeAccount,
    refresh,
  };
}
