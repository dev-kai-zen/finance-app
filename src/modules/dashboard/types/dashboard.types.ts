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

export interface DashboardSummary {
  netWorthMinorUnits: number;
  totalAssetsMinorUnits: number;
  totalLiabilitiesMinorUnits: number;
  monthlyCashflow: MonthlyCashflow;
  topSpendingCategories: CategorySpendingItem[];
  recentTransactions: TransactionListItem[];
  accountsWithBalances: AccountWithBalance[];
}
