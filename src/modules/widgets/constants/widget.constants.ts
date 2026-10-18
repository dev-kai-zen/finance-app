export const QUICK_EXPENSE_WIDGET_NAME = "QuickExpenseWidget";
export const QUICK_INCOME_WIDGET_NAME = "QuickIncomeWidget";
export const QUICK_TRANSFER_WIDGET_NAME = "QuickTransferWidget";
export const DUAL_ACTION_WIDGET_NAME = "DualActionWidget";
export const TRIPLE_ACTION_WIDGET_NAME = "TripleActionWidget";

export const QUICK_EXPENSE_DEEP_LINK =
  "finance-app://transactions?action=new&type=expense&source=widget";
export const QUICK_INCOME_DEEP_LINK =
  "finance-app://transactions?action=new&type=income&source=widget";
export const QUICK_TRANSFER_DEEP_LINK =
  "finance-app://transactions?action=new&type=transfer&source=widget";

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

