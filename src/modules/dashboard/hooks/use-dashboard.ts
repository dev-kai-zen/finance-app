import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useCurrencyPreferences } from "@/modules/currencies";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { getDashboardSummary } from "../repositories/dashboard.repository";
import type { DashboardSummary } from "../types/dashboard.types";

export function useDashboard() {
  const { preferences } = useCurrencyPreferences();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(() => {
    runDeferredSyncQuery(
      {
        hasCachedResult: hasLoadedOnceRef.current,
        setLoading,
        onMarkLoaded: () => {
          hasLoadedOnceRef.current = true;
        },
      },
      () => {
        try {
          setError(null);
          const quick = getDashboardSummary(undefined, new Date(), {
            includeNetWorthHistory: false,
          });
          setSummary(quick);
          scheduleAfterPaint(() => {
            try {
              setSummary(getDashboardSummary());
            } catch (err: any) {
              setError(err?.message || "Failed to load dashboard data.");
            }
          });
        } catch (err: any) {
          setError(err?.message || "Failed to load dashboard data.");
        }
      },
    );
  }, [preferences.defaultCurrency]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return {
    summary,
    loading,
    error,
    refresh,
  };
}
