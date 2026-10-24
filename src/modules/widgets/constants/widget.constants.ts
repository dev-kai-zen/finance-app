export const QUICK_EXPENSE_WIDGET_NAME = "QuickExpenseWidget";
export const QUICK_INCOME_WIDGET_NAME = "QuickIncomeWidget";
export const QUICK_TRANSFER_WIDGET_NAME = "QuickTransferWidget";
export const DUAL_ACTION_WIDGET_NAME = "DualActionWidget";
export const TRIPLE_ACTION_WIDGET_NAME = "TripleActionWidget";
export const MONTHLY_CASHFLOW_WIDGET_NAME = "MonthlyCashflowWidget";
export const NET_WORTH_WIDGET_NAME = "NetWorthWidget";
export const MONTHLY_BUDGET_WIDGET_NAME = "MonthlyBudgetWidget";

export const QUICK_EXPENSE_DEEP_LINK =
  "finance-app://transactions?action=new&type=expense&source=widget";
export const QUICK_INCOME_DEEP_LINK =
  "finance-app://transactions?action=new&type=income&source=widget";
export const QUICK_TRANSFER_DEEP_LINK =
  "finance-app://transactions?action=new&type=transfer&source=widget";
export const DASHBOARD_DEEP_LINK = "finance-app://";
export const BUDGETS_DEEP_LINK = "finance-app://budgets";
export const PRO_PAYWALL_DEEP_LINK = "finance-app://settings?openPro=true";

export const WIDGET_SNAPSHOT_SETTINGS_KEY = "widget_financial_snapshot";

export const DEFAULT_WIDGET_SNAPSHOT = {
  monthLabel: "This Month",
  inflowMinorUnits: 0,
  inflowFormatted: "₱0.00",
  outflowMinorUnits: 0,
  outflowFormatted: "₱0.00",
  netSavingsMinorUnits: 0,
  netSavingsFormatted: "₱0.00",
  savingsRatePercentage: 0,
  netWorthMinorUnits: 0,
  netWorthFormatted: "₱0.00",
  totalAssetsMinorUnits: 0,
  totalAssetsFormatted: "₱0.00",
  totalLiabilitiesMinorUnits: 0,
  totalLiabilitiesFormatted: "₱0.00",
  netWorthChangePercentage: null,
  budgetTotalMinorUnits: 0,
  budgetTotalFormatted: "₱0.00",
  budgetSpentMinorUnits: 0,
  budgetSpentFormatted: "₱0.00",
  budgetRemainingMinorUnits: 0,
  budgetRemainingFormatted: "₱0.00",
  budgetPercentage: 0,
  hasActiveBudgets: false,
  isBudgetExceeded: false,
  currencyCode: "PHP",
  isPro: false,
  updatedAt: 0,
} as const;



export const WIDGET_THEME = {
  background: "#11231E",
  surface: "#1A352E",
  border: "#244A40",
  textPrimary: "#FFFFFF",
  textSecondary: "#A3BDB3",
  expenseAccent: "#EF4444",
  expenseBadgeBg: "#2B1D1D",
  expenseBadgeBorder: "#7F1D1D",
  incomeAccent: "#10B981",
  incomeBadgeBg: "#132D24",
  incomeBadgeBorder: "#1B4D3E",
  transferAccent: "#38BDF8",
  transferBadgeBg: "#142834",
  transferBadgeBorder: "#1E475E",
} as const;

