import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  getTransactionViewMode,
  setTransactionViewMode as saveTransactionViewMode,
  type TransactionViewMode,
} from "@/modules/settings";

function readTransactionViewMode(): TransactionViewMode {
  try {
    return getTransactionViewMode();
  } catch {
    return "compact";
  }
}

export function useTransactionViewMode() {
  const [viewMode, setViewModeState] =
    useState<TransactionViewMode>(readTransactionViewMode);

  useFocusEffect(
    useCallback(() => {
      setViewModeState(readTransactionViewMode());
    }, []),
  );

  const setViewMode = useCallback((nextViewMode: TransactionViewMode) => {
    setViewModeState(nextViewMode);

    try {
      saveTransactionViewMode(nextViewMode);
    } catch {
      // Keep the current-session preference if persistence is unavailable.
    }
  }, []);

  return { viewMode, setViewMode };
}
