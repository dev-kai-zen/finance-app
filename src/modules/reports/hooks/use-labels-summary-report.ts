import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCurrencyPreferences } from "@/modules/currencies";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { getLabelsSummaryReport } from "../services/get-labels-summary-report.service";
import type {
  IncomeExpenseMode,
  IncomeExpensePeriodPreset,
} from "../types/income-expense.types";
import type { LabelsSummaryReportData } from "../types/labels-summary.types";
import { getIncomeExpenseDateRange } from "../utils/income-expense-dates";
import { toDateKey } from "../utils/reports-dates";

const EMPTY_LABELS_REPORT: LabelsSummaryReportData = {
  mode: "expense",
  range: {
    preset: "this-month",
    startDate: new Date(0),
    endDate: new Date(0),
    label: "",
  },
  totalMinorUnits: 0,
  labeledMinorUnits: 0,
  unlabeledMinorUnits: 0,
  transactionCount: 0,
  labeledTransactionCount: 0,
  unlabeledTransactionCount: 0,
  labels: [],
};

export function useLabelsSummaryReport() {
  const { preferences } = useCurrencyPreferences();
  const [mode, setMode] = useState<IncomeExpenseMode>("expense");
  const [preset, setPreset] = useState<IncomeExpensePeriodPreset>("this-month");

  const now = useMemo(() => new Date(), []);
  const [customDateA, setCustomDateA] = useState<string>(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return toDateKey(start);
  });
  const [customDateB, setCustomDateB] = useState<string>(() => toDateKey(now));

  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [data, setData] = useState<LabelsSummaryReportData>(EMPTY_LABELS_REPORT);
  const [reportLoading, setReportLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const isFocusedRef = useRef(true);
  const isDirtyRef = useRef(false);

  const range = useMemo(() => {
    return getIncomeExpenseDateRange(preset, {
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
          setData(getLabelsSummaryReport(mode, range));
          setError(null);
        } catch (err: any) {
          setError(err?.message || "Failed to load report data.");
        }
      },
    );
  }, [mode, range, preferences.defaultCurrency]);

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
    mode,
    setMode,
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
    selectedLabelId,
    setSelectedLabelId,
  };
}
