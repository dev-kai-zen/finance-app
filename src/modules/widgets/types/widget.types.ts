export type WidgetActionType =
  | "WIDGET_ADDED"
  | "WIDGET_UPDATE"
  | "WIDGET_RESIZED"
  | "WIDGET_DELETED"
  | "WIDGET_CLICK";

export interface WidgetRouteParams {
  action?: "new";
  type?: "expense" | "income" | "transfer";
  source?: "widget";
}

export interface FinancialWidgetSnapshot {
  monthLabel: string;
  inflowMinorUnits: number;
  inflowFormatted: string;
  outflowMinorUnits: number;
  outflowFormatted: string;
  netSavingsMinorUnits: number;
  netSavingsFormatted: string;
  savingsRatePercentage: number;
  netWorthMinorUnits: number;
  netWorthFormatted: string;
  totalAssetsMinorUnits: number;
  totalAssetsFormatted: string;
  totalLiabilitiesMinorUnits: number;
  totalLiabilitiesFormatted: string;
  netWorthChangePercentage: number | null;
  budgetTotalMinorUnits: number;
  budgetTotalFormatted: string;
  budgetSpentMinorUnits: number;
  budgetSpentFormatted: string;
  budgetRemainingMinorUnits: number;
  budgetRemainingFormatted: string;
  budgetPercentage: number;
  hasActiveBudgets: boolean;
  isBudgetExceeded: boolean;
  currencyCode: string;
  isPro?: boolean;
  updatedAt: number;
}

