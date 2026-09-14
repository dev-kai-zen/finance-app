import { desc, eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accounts, categories, transactions } from "@/infrastructure/database/schema";
import { listAccounts } from "@/modules/accounts/repositories/accounts.repository";
import { listTransactions } from "@/modules/transactions/repositories/transactions.repository";
import type {
  AccountWithBalance,
  CategorySpendingItem,
  DashboardSummary,
  MonthlyCashflow,
} from "../types/dashboard.types";

export function getAccountDynamicBalances(
  context: DbContext = db,
): AccountWithBalance[] {
  const allAccounts = listAccounts(context);
  const allTransactions = context.select().from(transactions).all();

  // Map account balances
  const deltasByAccountId: Record<string, number> = {};

  for (const tx of allTransactions) {
    deltasByAccountId[tx.accountId] =
      (deltasByAccountId[tx.accountId] || 0) + tx.amountCents;
  }

  return allAccounts.map((acc) => {
    const delta = deltasByAccountId[acc.id] || 0;
    const currentBalance = acc.openingBalanceMinorUnits + delta;
    return {
      ...acc,
      currentBalanceMinorUnits: currentBalance,
    };
  });
}

export function getMonthlyCashflow(
  context: DbContext = db,
  targetDate: Date = new Date(),
): MonthlyCashflow {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const monthLabel = targetDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const allTx = context.select().from(transactions).all();

  let totalInflow = 0;
  let totalOutflow = 0;

  for (const tx of allTx) {
    const txDate = new Date(tx.occurredAt);
    if (txDate >= startOfMonth && txDate <= endOfMonth) {
      if (tx.transactionGroupId) {
        continue;
      }
      if (tx.amountCents > 0) {
        totalInflow += tx.amountCents;
      } else if (tx.amountCents < 0) {
        totalOutflow += Math.abs(tx.amountCents);
      }
    }
  }

  const netSavings = totalInflow - totalOutflow;
  const savingsRate =
    totalInflow > 0
      ? Math.max(0, Math.min(100, Math.round((netSavings / totalInflow) * 100)))
      : 0;

  return {
    totalInflowMinorUnits: totalInflow,
    totalOutflowMinorUnits: totalOutflow,
    netSavingsMinorUnits: netSavings,
    savingsRatePercentage: savingsRate,
    monthLabel,
  };
}

export function getCategorySpendingBreakdown(
  context: DbContext = db,
  targetDate: Date = new Date(),
): CategorySpendingItem[] {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const txRows = context
    .select({
      transaction: transactions,
      category: categories,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.type, "expense"))
    .all();

  const spendingByCategory: Record<
    string,
    {
      name: string;
      color: string | null;
      icon: string | null;
      total: number;
    }
  > = {};

  let overallExpense = 0;

  for (const { transaction: tx, category: cat } of txRows) {
    const txDate = new Date(tx.occurredAt);
    if (txDate >= startOfMonth && txDate <= endOfMonth) {
      const catId = cat?.id ?? "uncategorized";
      const catName = cat?.name ?? "Uncategorized";
      const catColor = cat?.color ?? "slate";
      const catIcon = cat?.icon ?? "tag";

      if (!spendingByCategory[catId]) {
        spendingByCategory[catId] = {
          name: catName,
          color: catColor,
          icon: catIcon,
          total: 0,
        };
      }

      const expenseMagnitude = Math.abs(tx.amountCents);
      spendingByCategory[catId].total += expenseMagnitude;
      overallExpense += expenseMagnitude;
    }
  }

  const items: CategorySpendingItem[] = Object.entries(spendingByCategory).map(
    ([id, val]) => ({
      categoryId: id,
      categoryName: val.name,
      categoryColor: val.color,
      categoryIcon: val.icon,
      totalMinorUnits: val.total,
      percentage:
        overallExpense > 0
          ? Math.round((val.total / overallExpense) * 100)
          : 0,
    }),
  );

  return items.sort((a, b) => b.totalMinorUnits - a.totalMinorUnits);
}

export function getDashboardSummary(
  context: DbContext = db,
  targetDate: Date = new Date(),
): DashboardSummary {
  const accountsWithBalances = getAccountDynamicBalances(context);
  const activeAccounts = accountsWithBalances.filter((a) => !a.isArchived);

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const acc of activeAccounts) {
    if (acc.accountType?.accountGroup === "liability") {
      totalLiabilities += acc.currentBalanceMinorUnits;
    } else {
      totalAssets += acc.currentBalanceMinorUnits;
    }
  }

  const netWorth = totalAssets - totalLiabilities;
  const monthlyCashflow = getMonthlyCashflow(context, targetDate);
  const topSpendingCategories = getCategorySpendingBreakdown(
    context,
    targetDate,
  );
  const recentTransactions = listTransactions(undefined, context).slice(0, 5);

  return {
    netWorthMinorUnits: netWorth,
    totalAssetsMinorUnits: totalAssets,
    totalLiabilitiesMinorUnits: totalLiabilities,
    monthlyCashflow,
    topSpendingCategories,
    recentTransactions,
    accountsWithBalances,
  };
}
