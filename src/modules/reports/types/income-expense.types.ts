export type IncomeExpensePeriodPreset =
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year"
  | "custom";

export type IncomeExpenseMode = "expense" | "income";

export interface IncomeExpenseDateRange {
  preset: IncomeExpensePeriodPreset;
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface IncomeExpenseCategoryItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  totalMinorUnits: number;
  percentage: number;
  transactionCount: number;
}

export interface IncomeExpenseReportData {
  mode: IncomeExpenseMode;
  range: IncomeExpenseDateRange;
  totalMinorUnits: number;
  transactionCount: number;
  categories: IncomeExpenseCategoryItem[];
}
