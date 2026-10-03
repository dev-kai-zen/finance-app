export type NetWorthGrowthPreset = "6m" | "1y" | "all" | "custom";

export interface NetWorthGrowthDateRange {
  preset: NetWorthGrowthPreset;
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface NetWorthPoint {
  date: Date;
  label: string;
  netWorthMinorUnits: number;
  totalAssetsMinorUnits: number;
  totalLiabilitiesMinorUnits: number;
  diffFromPriorMinorUnits: number;
  symbol: "▲" | "▼" | "";
  color: string;
  formattedNetWorth: string;
  formattedDiff: string;
}

export interface NetWorthGrowthReportData {
  range: NetWorthGrowthDateRange;
  currentNetWorthMinorUnits: number;
  startingNetWorthMinorUnits: number;
  periodChangeMinorUnits: number;
  periodChangePercentage: number | null;
  peakNetWorthMinorUnits: number;
  lowestNetWorthMinorUnits: number;
  points: NetWorthPoint[];
}
