export type ReportTabKey =
  | "balance-sheet"
  | "income-expense"
  | "cash-flow"
  | "net-worth";

export interface ReportTabItem {
  key: ReportTabKey;
  label: string;
  isAvailable: boolean;
  badge?: string;
}

export type ComparisonPreset = "prev-vs-today" | "mom" | "ytd" | "custom";

export interface ComparisonDateRange {
  prevDate: Date;
  currentDate: Date;
  prevLabel: string;
  currentLabel: string;
}

export type ExpandLevel = "pockets" | "accounts";
export type CollapseLevel = "types" | "groups";

export interface VarianceValue {
  prevMinorUnits: number;
  currentMinorUnits: number;
  diffMinorUnits: number;
  isFavorable: boolean;
  direction: "up" | "down" | "neutral";
  symbol: "▲" | "▼" | "";
  color: string;
  formattedDiff: string;
}

export interface ReportPocketNode {
  id: string;
  name: string;
  targetAmountMinorUnits: number | null;
  variance: VarianceValue;
}

export interface ReportAccountNode {
  id: string;
  name: string;
  iconKey: string | null;
  currencyCode: string;
  pocketEnabled: boolean;
  variance: VarianceValue;
  pockets: ReportPocketNode[];
}

export interface ReportAccountTypeNode {
  id: string;
  name: string;
  iconKey: string | null;
  color: string | null;
  sortOrder: number;
  variance: VarianceValue;
  accounts: ReportAccountNode[];
}

export interface ReportGroupNode {
  group: "asset" | "liability";
  title: string;
  variance: VarianceValue;
  accountTypes: ReportAccountTypeNode[];
}

export interface BalanceSheetComparisonData {
  range: ComparisonDateRange;
  assets: ReportGroupNode;
  liabilities: ReportGroupNode;
  netWorth: {
    prevMinorUnits: number;
    currentMinorUnits: number;
    diffMinorUnits: number;
    variance: VarianceValue;
  };
}
