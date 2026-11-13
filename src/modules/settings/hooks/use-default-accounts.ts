import { useCallback, useEffect, useRef, useState } from "react";
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
      const next = getDefaultAccounts();
      setDefaults((prev) => (prev === next ? prev : next));
    } catch {
      // Ignore read errors during DB transitions
    }
  }, []);

  useEffect(() => {
    return subscribeToDefaultAccounts(refresh);
  }, [refresh]);

  const [, setDisplayRevision] = useState(0);
  const needsLocationResolutionRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      if (needsLocationResolutionRef.current) {
        setDisplayRevision((value) => value + 1);
      }
    }, [refresh]),
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
    get expenseLocation() {
      needsLocationResolutionRef.current = true;
      return resolveAccountLocation(
        defaults.defaultExpenseAccountId,
        defaults.defaultExpensePocketId,
      );
    },
    get incomeLocation() {
      needsLocationResolutionRef.current = true;
      return resolveAccountLocation(
        defaults.defaultIncomeAccountId,
        defaults.defaultIncomePocketId,
      );
    },
    setExpenseAccount,
    setIncomeAccount,
    refresh,
  };
}
