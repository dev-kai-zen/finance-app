import { deferComponent, deferFunction } from "@/utils/deferred-module";

// Screens
export const ReportsScreen = deferComponent(
  () => require("./screens/reports-screen").ReportsScreen,
  "ReportsScreen",
) as typeof import("./screens/reports-screen").ReportsScreen;

// Hooks
export const useBalanceSheetReport = deferFunction(
  () => require("./hooks/use-balance-sheet-report").useBalanceSheetReport,
) as typeof import("./hooks/use-balance-sheet-report").useBalanceSheetReport;

export const useIncomeExpenseReport = deferFunction(
  () => require("./hooks/use-income-expense-report").useIncomeExpenseReport,
) as typeof import("./hooks/use-income-expense-report").useIncomeExpenseReport;

export const useCashFlowReport = deferFunction(
  () => require("./hooks/use-cash-flow-report").useCashFlowReport,
) as typeof import("./hooks/use-cash-flow-report").useCashFlowReport;

export const useNetWorthGrowthReport = deferFunction(
  () =>
    require("./hooks/use-net-worth-growth-report").useNetWorthGrowthReport,
) as typeof import("./hooks/use-net-worth-growth-report").useNetWorthGrowthReport;

// Services
export const getBalanceSheetComparison = deferFunction(
  () =>
    require("./services/get-balance-sheet-comparison.service")
      .getBalanceSheetComparison,
) as typeof import("./services/get-balance-sheet-comparison.service").getBalanceSheetComparison;

export const calculateVariance = deferFunction(
  () =>
    require("./services/get-balance-sheet-comparison.service").calculateVariance,
) as typeof import("./services/get-balance-sheet-comparison.service").calculateVariance;

export const getIncomeExpenseReport = deferFunction(
  () =>
    require("./services/get-income-expense-report.service")
      .getIncomeExpenseReport,
) as typeof import("./services/get-income-expense-report.service").getIncomeExpenseReport;

export const getCashFlowReport = deferFunction(
  () => require("./services/get-cash-flow-report.service").getCashFlowReport,
) as typeof import("./services/get-cash-flow-report.service").getCashFlowReport;

export const getNetWorthGrowthReport = deferFunction(
  () =>
    require("./services/get-net-worth-growth-report.service")
      .getNetWorthGrowthReport,
) as typeof import("./services/get-net-worth-growth-report.service").getNetWorthGrowthReport;

// Types & Constants
export * from "./types/reports.types";
export * from "./types/income-expense.types";
export * from "./types/cash-flow.types";
export * from "./types/net-worth-growth.types";
export * from "./constants/reports.constants";
