import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useCurrencyPreferences } from "@/modules/currencies";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import {
  getDashboardSummary,
  getNetWorthHistory,
} from "../repositories/dashboard.repository";
import type { DashboardSummary } from "../types/dashboard.types";

export function useDashboard() {
  const { preferences } = useCurrencyPreferences();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const requestIdRef = useRef(0);
  const cancelPendingQueryRef = useRef<(() => void) | null>(null);
  const cancelPendingHistoryRef = useRef<(() => void) | null>(null);

  const cancelPending = useCallback(() => {
    cancelPendingQueryRef.current?.();
    cancelPendingQueryRef.current = null;
    cancelPendingHistoryRef.current?.();
    cancelPendingHistoryRef.current = null;
  }, []);

  const refresh = useCallback(() => {
    cancelPending();
    const requestId = ++requestIdRef.current;

    cancelPendingQueryRef.current = runDeferredSyncQuery(
      {
        hasCachedResult: hasLoadedOnceRef.current,
        setLoading,
        onMarkLoaded: () => {
          hasLoadedOnceRef.current = true;
        },
      },
      () => {
        cancelPendingQueryRef.current = null;
        if (requestId !== requestIdRef.current) {
          return;
        }
        try {
          setError(null);
          const quick = getDashboardSummary(undefined, new Date(), {
            includeNetWorthHistory: false,
          });
          setSummary(quick);
          cancelPendingHistoryRef.current = scheduleAfterPaint(() => {
            cancelPendingHistoryRef.current = null;
            if (requestId !== requestIdRef.current) {
              return;
            }
            try {
              const netWorthHistory = getNetWorthHistory(
                quick.accountsWithBalances,
              );
              const monthlyPoints = netWorthHistory["1Y"];
              const currentPoint = monthlyPoints.at(-1);
              const previousMonthPoint = monthlyPoints.at(-2);
              const netWorthChangePercentage =
                currentPoint &&
                previousMonthPoint &&
                previousMonthPoint.netWorthMinorUnits !== 0
                  ? Math.round(
                      ((currentPoint.netWorthMinorUnits -
                        previousMonthPoint.netWorthMinorUnits) /
                        Math.abs(previousMonthPoint.netWorthMinorUnits)) *
                        100,
                    )
                  : null;

              setSummary((prev) =>
                prev
                  ? {
                      ...prev,
                      netWorthHistory,
                      netWorthChangePercentage,
                    }
                  : null,
              );
            } catch (err: any) {
              setError(err?.message || "Failed to load dashboard data.");
            }
          });
        } catch (err: any) {
          setError(err?.message || "Failed to load dashboard data.");
        }
      },
    );
  }, [cancelPending, preferences.defaultCurrency]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => {
        requestIdRef.current += 1;
        cancelPending();
      };
    }, [cancelPending, refresh]),
  );

  return {
    summary,
    loading,
    error,
    refresh,
  };
}
