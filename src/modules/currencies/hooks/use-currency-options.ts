import { useEffect, useState } from "react";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { listCurrencies } from "../repositories/currencies.repository";
import type { Currency } from "../types/currency.types";

/** Picker-only snapshot; usage/management checks are unnecessary for selection. */
export function useCurrencyOptions() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelPending: (() => void) | undefined;
    const refresh = () => {
      cancelPending?.();
      cancelPending = runDeferredSyncQuery(
        { hasCachedResult: false, setLoading },
        () => setCurrencies(listCurrencies()),
      );
    };
    refresh();
    const unsubscribe = subscribeToDatabaseReplacement(refresh);
    return () => {
      unsubscribe();
      cancelPending?.();
    };
  }, []);

  return { currencies, loading };
}
