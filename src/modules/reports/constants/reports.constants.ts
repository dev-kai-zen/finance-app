import type { ComparisonPreset, ReportTabItem } from "../types/reports.types";

export const REPORT_TABS: ReportTabItem[] = [
  { key: "balance-sheet", label: "Balance Sheet", isAvailable: true },
  { key: "income-expense", label: "Income & Expense", isAvailable: true },
  { key: "cash-flow", label: "Cash Flow", isAvailable: true },
  { key: "net-worth", label: "Net Worth Growth", isAvailable: true },
];

export interface PresetOption {
  key: ComparisonPreset;
  label: string;
  description: string;
}

export const COMPARISON_PRESETS: PresetOption[] = [
  {
    key: "prev-vs-today",
    label: "Previous Month End vs As of Today",
    description: "Compare the last day of previous month with today's live balance",
  },
  {
    key: "mom",
    label: "Month-over-Month (MoM)",
    description: "Compare the end of previous month with the end of selected month",
  },
  {
    key: "ytd",
    label: "Year-to-Date (YTD)",
    description: "Compare end of prior year (Dec 31) with today's live balance",
  },
  {
    key: "custom",
    label: "Custom Cutoff Dates",
    description: "Pick custom Date A and Date B for comparison",
  },
];

export const REPORT_COLORS = {
  positiveGreen: "#10B981", // Emerald green
  negativeRed: "#EF4444",   // Coral red
  neutralMuted: "#64748B",  // Slate muted
} as const;
