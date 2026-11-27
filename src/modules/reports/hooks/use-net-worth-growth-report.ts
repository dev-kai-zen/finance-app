import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCurrencyPreferences } from "@/modules/currencies";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { getNetWorthGrowthReport } from "../services/get-net-worth-growth-report.service";
import type {
  NetWorthGrowthDateRange,
  NetWorthGrowthPreset,
  NetWorthGrowthReportData,
} from "../types/net-worth-growth.types";
import { getNetWorthDateRange } from "../utils/net-worth-dates";
import { toDateKey } from "../utils/reports-dates";

const EMPTY_NET_WORTH_REPORT: NetWorthGrowthReportData = {
  range: {
    preset: "1y",
    startDate: new Date(0),
    endDate: new Date(0),
    label: "",
  },
  currentNetWorthMinorUnits: 0,
  startingNetWorthMinorUnits: 0,
  periodChangeMinorUnits: 0,
  periodChangePercentage: null,
  peakNetWorthMinorUnits: 0,
  lowestNetWorthMinorUnits: 0,
  points: [],
};

export function useNetWorthGrowthReport() {
  const { preferences } = useCurrencyPreferences();
  const [preset, setPreset] = useState<NetWorthGrowthPreset>("1y");

  const now = useMemo(() => new Date(), []);
  const [customDateA, setCustomDateA] = useState<string>(() => {
    const prev = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return toDateKey(prev);
  });
  const [customDateB, setCustomDateB] = useState<string>(() => toDateKey(now));

  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [data, setData] = useState<NetWorthGrowthReportData>(EMPTY_NET_WORTH_REPORT);
  const [reportLoading, setReportLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const isFocusedRef = useRef(true);
  const isDirtyRef = useRef(false);

  const range: NetWorthGrowthDateRange = useMemo(() => {
    return getNetWorthDateRange(preset, {
      customDateA,
      customDateB,
    });
  }, [preset, customDateA, customDateB]);

  const refresh = useCallback(() => {
    runDeferredSyncQuery(
      {
        hasCachedResult: hasLoadedOnceRef.current,
        setLoading: setReportLoading,
        onMarkLoaded: () => {
          hasLoadedOnceRef.current = true;
        },
      },
      () => {
        try {
          setData(getNetWorthGrowthReport(range));
          setError(null);
        } catch (err: any) {
          setError(err?.message || "Failed to load report data.");
        }
      },
    );
  }, [range, preferences.defaultCurrency]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      if (isDirtyRef.current) {
        isDirtyRef.current = false;
        refresh();
      }
      return () => {
        isFocusedRef.current = false;
      };
    }, [refresh]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "FINANCE_APP_TRANSACTION_MUTATED",
      () => {
        if (!isFocusedRef.current) {
          isDirtyRef.current = true;
          return;
        }
        refresh();
      },
    );
    return () => sub.remove();
  }, [refresh]);

  return {
    preset,
    setPreset,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    range,
    data,
    error,
    refresh,
    reportLoading,
    selectedPointIndex,
    setSelectedPointIndex,
  };
}
