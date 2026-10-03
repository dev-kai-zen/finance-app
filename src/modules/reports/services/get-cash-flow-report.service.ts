import { db, type DbContext } from "@/infrastructure/database/client";
import { getCashFlowHistory } from "@/modules/transactions";
import { formatCurrency } from "@/utils/currency";
import { REPORT_COLORS } from "../constants/reports.constants";
import type {
  CashFlowDateRange,
  CashFlowReportData,
  CashFlowRowItem,
} from "../types/cash-flow.types";

export function getCashFlowReport(
  range: CashFlowDateRange,
  context: DbContext = db,
): CashFlowReportData {
  const history = getCashFlowHistory(
    {
      startDate: range.startDate,
      endDate: range.endDate,
    },
    context,
  );

  const periods: CashFlowRowItem[] = history.periods.map((p) => {
    let symbol: "▲" | "▼" | "" = "";
    let color: string = REPORT_COLORS.neutralMuted;
    let formattedNet = formatCurrency(0, "PHP");

    if (p.netCashFlowMinorUnits > 0) {
      symbol = "▲";
      color = REPORT_COLORS.positiveGreen;
      formattedNet = `+${formatCurrency(p.netCashFlowMinorUnits, "PHP")}`;
    } else if (p.netCashFlowMinorUnits < 0) {
      symbol = "▼";
      color = REPORT_COLORS.negativeRed;
      formattedNet = `-${formatCurrency(Math.abs(p.netCashFlowMinorUnits), "PHP")}`;
    }

    return {
      periodKey: p.periodKey,
      periodLabel: p.periodLabel,
      startDate: p.startDate,
      endDate: p.endDate,
      inflowMinorUnits: p.inflowMinorUnits,
      outflowMinorUnits: p.outflowMinorUnits,
      netCashFlowMinorUnits: p.netCashFlowMinorUnits,
      savingsRatePercentage: p.savingsRatePercentage,
      symbol,
      color,
      formattedNet,
    };
  });

  return {
    range,
    totalInflowMinorUnits: history.totalInflowMinorUnits,
    totalOutflowMinorUnits: history.totalOutflowMinorUnits,
    netCashFlowMinorUnits: history.netCashFlowMinorUnits,
    averageMonthlyNetMinorUnits: history.averageMonthlyNetMinorUnits,
    overallSavingsRatePercentage: history.overallSavingsRatePercentage,
    periods,
  };
}
