import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useCurrencyPreferences } from "@/modules/currencies";
import { getCreditCardMonitoring } from "../services/get-credit-card-monitoring.service";
import type { CreditCardMonitoringSummary } from "../types/credit-card.types";

const EMPTY_SUMMARY: CreditCardMonitoringSummary = {
  cards: [],
  dueThisMonthMinorUnits: 0,
  overdueMinorUnits: 0,
};

export function useCreditCardMonitoring() {
  const { preferences } = useCurrencyPreferences();
  const [data, setData] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setLoading(true);
    try {
      setData(getCreditCardMonitoring());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load credit-card monitoring.",
      );
    } finally {
      setLoading(false);
    }
  }, [preferences.defaultCurrency]);
  useFocusEffect(useCallback(() => refresh(), [refresh]));
  return { ...data, loading, error, refresh };
}
