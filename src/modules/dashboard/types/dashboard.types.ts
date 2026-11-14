import type { AccountListItem } from "@/modules/accounts/types/account.types";
import type { TransactionListItem } from "@/modules/transactions/types/transaction.types";

export interface AccountWithBalance extends AccountListItem {
  currentBalanceMinorUnits: number;
}

export interface CategorySpendingItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  totalMinorUnits: number;
  percentage: number;
}

export interface MonthlyCashflow {
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netSavingsMinorUnits: number;
  savingsRatePercentage: number;
  monthLabel: string;
}

export type NetWorthPeriod = "1W" | "3M" | "6M" | "1Y" | "ALL";

export interface NetWorthHistoryPoint {
  date: Date;
  label: string;
  netWorthMinorUnits: number;
  totalAssetsMinorUnits: number;
  totalLiabilitiesMinorUnits: number;
}

export type NetWorthHistory = Record<
  NetWorthPeriod,
  NetWorthHistoryPoint[]
> & {
  byYear?: Record<number, NetWorthHistoryPoint[]>;
  availableYears?: number[];
};

export interface DashboardSummary {
  netWorthMinorUnits: number;
  totalAssetsMinorUnits: number;
  totalLiabilitiesMinorUnits: number;
  netWorthChangePercentage: number | null;
  netWorthHistory: NetWorthHistory;
  monthlyCashflow: MonthlyCashflow;
  topSpendingCategories: CategorySpendingItem[];
  recentTransactions: TransactionListItem[];
  accountsWithBalances: AccountWithBalance[];
}
