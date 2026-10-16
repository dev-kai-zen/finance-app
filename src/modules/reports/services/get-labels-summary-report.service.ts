import { db, type DbContext } from "@/infrastructure/database/client";
import { getLabelBreakdown } from "@/modules/transactions";
import type {
  IncomeExpenseDateRange,
  IncomeExpenseMode,
} from "../types/income-expense.types";
import type { LabelsSummaryReportData } from "../types/labels-summary.types";

export function getLabelsSummaryReport(
  mode: IncomeExpenseMode,
  range: IncomeExpenseDateRange,
  context: DbContext = db,
): LabelsSummaryReportData {
  const result = getLabelBreakdown(
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
    labeledMinorUnits: result.labeledMinorUnits,
    unlabeledMinorUnits: result.unlabeledMinorUnits,
    transactionCount: result.transactionCount,
    labeledTransactionCount: result.labeledTransactionCount,
    unlabeledTransactionCount: result.unlabeledTransactionCount,
    labels: result.items,
  };
}
