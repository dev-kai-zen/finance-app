export type CashFlowPeriodPreset = "6m" | "12m" | "ytd" | "custom";

export interface CashFlowDateRange {
  preset: CashFlowPeriodPreset;
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface CashFlowRowItem {
  periodKey: string;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  inflowMinorUnits: number;
  outflowMinorUnits: number;
  netCashFlowMinorUnits: number;
  savingsRatePercentage: number;
  symbol: "▲" | "▼" | "";
  color: string;
  formattedNet: string;
}

export interface CashFlowReportData {
  range: CashFlowDateRange;
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netCashFlowMinorUnits: number;
  averageMonthlyNetMinorUnits: number;
  overallSavingsRatePercentage: number;
  periods: CashFlowRowItem[];
}
