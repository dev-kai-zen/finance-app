import type {
  IncomeExpenseDateRange,
  IncomeExpenseMode,
} from "./income-expense.types";

export interface LabelsSummaryItem {
  labelId: string;
  labelName: string;
  labelColor: string | null;
  totalMinorUnits: number;
  percentage: number;
  transactionCount: number;
}

export interface LabelsSummaryReportData {
  mode: IncomeExpenseMode;
  range: IncomeExpenseDateRange;
  totalMinorUnits: number;
  labeledMinorUnits: number;
  unlabeledMinorUnits: number;
  transactionCount: number;
  labeledTransactionCount: number;
  unlabeledTransactionCount: number;
  labels: LabelsSummaryItem[];
}
