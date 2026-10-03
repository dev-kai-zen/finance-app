import { db, type DbContext } from "@/infrastructure/database/client";
import { getCategoryBreakdown } from "@/modules/transactions";
import type {
  IncomeExpenseDateRange,
  IncomeExpenseMode,
  IncomeExpenseReportData,
} from "../types/income-expense.types";

export function getIncomeExpenseReport(
  mode: IncomeExpenseMode,
  range: IncomeExpenseDateRange,
  context: DbContext = db,
): IncomeExpenseReportData {
  const result = getCategoryBreakdown(
    {
      type: mode,
      startDate: range.startDate,
      endDate: range.endDate,
    },
    context,
  );

  return {
    mode,
    range,
    totalMinorUnits: result.totalMinorUnits,
    transactionCount: result.transactionCount,
    categories: result.items,
  };
}
