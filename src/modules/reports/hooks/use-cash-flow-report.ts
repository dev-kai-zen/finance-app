import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCurrencyPreferences } from "@/modules/currencies";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { getCashFlowReport } from "../services/get-cash-flow-report.service";
import type {
  CashFlowDateRange,
  CashFlowPeriodPreset,
  CashFlowReportData,
} from "../types/cash-flow.types";
import { getCashFlowDateRange } from "../utils/cash-flow-dates";
import { toDateKey } from "../utils/reports-dates";

const EMPTY_CASH_FLOW_REPORT: CashFlowReportData = {
  range: {
    preset: "6m",
    startDate: new Date(0),
    endDate: new Date(0),
    label: "",
  },
  totalInflowMinorUnits: 0,
  totalOutflowMinorUnits: 0,
  netCashFlowMinorUnits: 0,
  averageMonthlyNetMinorUnits: 0,
  overallSavingsRatePercentage: 0,
  periods: [],
};

export function useCashFlowReport() {
  const { preferences } = useCurrencyPreferences();
  const [preset, setPreset] = useState<CashFlowPeriodPreset>("6m");

  const now = useMemo(() => new Date(), []);
  const [customDateA, setCustomDateA] = useState<string>(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return toDateKey(prev);
  });
  const [customDateB, setCustomDateB] = useState<string>(() => toDateKey(now));

  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
  const [data, setData] = useState<CashFlowReportData>(EMPTY_CASH_FLOW_REPORT);
  const [reportLoading, setReportLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const isFocusedRef = useRef(true);
  const isDirtyRef = useRef(false);

  const range: CashFlowDateRange = useMemo(() => {
    return getCashFlowDateRange(preset, {
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
          setData(getCashFlowReport(range));
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
    selectedPeriodKey,
    setSelectedPeriodKey,
  };
}
