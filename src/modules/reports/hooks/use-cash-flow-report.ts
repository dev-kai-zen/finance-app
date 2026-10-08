import { useMemo, useState } from "react";
import { useCurrencyPreferences } from "@/modules/currencies";
import { getCashFlowReport } from "../services/get-cash-flow-report.service";
import type {
  CashFlowDateRange,
  CashFlowPeriodPreset,
  CashFlowReportData,
} from "../types/cash-flow.types";
import { getCashFlowDateRange } from "../utils/cash-flow-dates";
import { toDateKey } from "../utils/reports-dates";

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

  const range: CashFlowDateRange = useMemo(() => {
    return getCashFlowDateRange(preset, {
      customDateA,
      customDateB,
    });
  }, [preset, customDateA, customDateB]);

  const data: CashFlowReportData = useMemo(() => {
    return getCashFlowReport(range);
  }, [range, preferences.defaultCurrency]);

  return {
    preset,
    setPreset,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    range,
    data,
    selectedPeriodKey,
    setSelectedPeriodKey,
  };
}
