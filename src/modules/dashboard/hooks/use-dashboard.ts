import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useCurrencyPreferences } from "@/modules/currencies";
import { getDashboardSummary } from "../repositories/dashboard.repository";
import type { DashboardSummary } from "../types/dashboard.types";

export function useDashboard() {
  const { preferences } = useCurrencyPreferences();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(() => {
    try {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      setError(null);
      const data = getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, [preferences.defaultCurrency]);

  useFocusEffect(
    useCallback(() => {
      const frameId = requestAnimationFrame(() => {
        refresh();
      });
      return () => cancelAnimationFrame(frameId);
    }, [refresh]),
  );

  return {
    summary,
    loading,
    error,
    refresh,
  };
}
