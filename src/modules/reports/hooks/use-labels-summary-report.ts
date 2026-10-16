import { useMemo, useState } from "react";
import { useCurrencyPreferences } from "@/modules/currencies";
import { getLabelsSummaryReport } from "../services/get-labels-summary-report.service";
import type {
  IncomeExpenseMode,
  IncomeExpensePeriodPreset,
} from "../types/income-expense.types";
import type { LabelsSummaryReportData } from "../types/labels-summary.types";
import { getIncomeExpenseDateRange } from "../utils/income-expense-dates";
import { toDateKey } from "../utils/reports-dates";

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

  const range = useMemo(() => {
    return getIncomeExpenseDateRange(preset, {
      customDateA,
      customDateB,
    });
  }, [preset, customDateA, customDateB]);

  const data: LabelsSummaryReportData = useMemo(() => {
    return getLabelsSummaryReport(mode, range);
  }, [mode, range, preferences.defaultCurrency]);

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
    selectedLabelId,
    setSelectedLabelId,
  };
}
