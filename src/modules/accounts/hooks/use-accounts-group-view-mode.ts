import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  getAccountsGroupViewMode,
  setAccountsGroupViewMode as saveAccountsGroupViewMode,
  type AccountsGroupViewMode,
} from "@/modules/settings";

function readAccountsGroupViewMode(): AccountsGroupViewMode {
  try {
    return getAccountsGroupViewMode();
  } catch {
    return "expanded";
  }
}

export function useAccountsGroupViewMode() {
  const [viewMode, setViewModeState] = useState<AccountsGroupViewMode>(readAccountsGroupViewMode);

  useFocusEffect(
    useCallback(() => {
      setViewModeState(readAccountsGroupViewMode());
    }, []),
  );

  const setViewMode = useCallback((nextViewMode: AccountsGroupViewMode) => {
    setViewModeState(nextViewMode);
    try {
      saveAccountsGroupViewMode(nextViewMode);
    } catch {
      // Keep session preference if persistence fails
    }
  }, []);

  return { viewMode, setViewMode };
}

