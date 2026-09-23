import { and, desc, eq, isNull } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accounts,
  categories,
  transactions,
} from "@/infrastructure/database/schema";
import { getAccountsWithBalances } from "@/modules/accounts";
import {
  getAccountBalanceDeltasAtDates,
  getRecentTransactions,
} from "@/modules/transactions";
import type {
  AccountWithBalance,
  CategorySpendingItem,
  DashboardSummary,
  MonthlyCashflow,
  NetWorthHistory,
  NetWorthHistoryPoint,
  NetWorthPeriod,
} from "../types/dashboard.types";

const NET_WORTH_PERIODS: NetWorthPeriod[] = ["1M", "3M", "6M", "1Y"];

export function getAccountDynamicBalances(
  context: DbContext = db,
): AccountWithBalance[] {
  return getAccountsWithBalances(context);
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

  const allTx = context
    .select()
    .from(transactions)
    .where(isNull(transactions.deletedAt))
    .all();

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
    .where(
      and(
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
      ),
    )
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
      const catColor = cat?.hexColorsId
        ? cat.hexColorsId.startsWith("color_")
          ? cat.hexColorsId.replace("color_", "")
          : cat.hexColorsId
        : "slate";
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
        overallExpense > 0 ? Math.round((val.total / overallExpense) * 100) : 0,
    }),
  );

  return items.sort((a, b) => b.totalMinorUnits - a.totalMinorUnits);
}

export function getDashboardSummary(
  context: DbContext = db,
  targetDate: Date = new Date(),
): DashboardSummary {
  const accountsWithBalances = getAccountDynamicBalances(context);
  const activeAccounts = accountsWithBalances.filter(
    (a) => !a.isArchived && !a.hideFromReports,
  );

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const acc of activeAccounts) {
    if (acc.accountType?.accountGroup === "liability") {
      totalLiabilities += acc.currentBalanceMinorUnits;
    } else {
      totalAssets += acc.currentBalanceMinorUnits;
    }
  }

  // Liabilities are stored as signed negative balances for easy summation: Assets + Liabilities
  const netWorth = totalAssets + totalLiabilities;

  const monthlyCashflow = getMonthlyCashflow(context, targetDate);
  const topSpendingCategories = getCategorySpendingBreakdown(
    context,
    targetDate,
  );
  const recentTransactions = getRecentTransactions(5, context);
  const netWorthHistory = getNetWorthHistory(
    accountsWithBalances,
    context,
    targetDate,
  );
  const monthlyPoints = netWorthHistory["1Y"];
  const currentPoint = monthlyPoints.at(-1);
  const previousMonthPoint = monthlyPoints.at(-2);
  const netWorthChangePercentage =
    currentPoint &&
    previousMonthPoint &&
    previousMonthPoint.netWorthMinorUnits !== 0
      ? Math.round(
          ((currentPoint.netWorthMinorUnits -
            previousMonthPoint.netWorthMinorUnits) /
            Math.abs(previousMonthPoint.netWorthMinorUnits)) *
            100,
        )
      : null;

  return {
    netWorthMinorUnits: netWorth,
    totalAssetsMinorUnits: totalAssets,
    totalLiabilitiesMinorUnits: totalLiabilities,
    netWorthChangePercentage,
    netWorthHistory,
    monthlyCashflow,
    topSpendingCategories,
    recentTransactions,
    accountsWithBalances,
  };
}

export function getNetWorthHistory(
  accountsWithBalances: AccountWithBalance[],
  context: DbContext = db,
  targetDate: Date = new Date(),
): NetWorthHistory {
  const cutoffsByPeriod = Object.fromEntries(
    NET_WORTH_PERIODS.map((period) => [
      period,
      getPeriodCutoffDates(period, targetDate),
    ]),
  ) as Record<NetWorthPeriod, Date[]>;

  const uniqueCutoffs = Array.from(
    new Map(
      NET_WORTH_PERIODS.flatMap((period) => cutoffsByPeriod[period]).map(
        (date) => [date.getTime(), date],
      ),
    ).values(),
  ).sort((a, b) => a.getTime() - b.getTime());
  const deltasAtCutoffs = getAccountBalanceDeltasAtDates(
    uniqueCutoffs,
    context,
  );
  const deltasByCutoff = new Map(
    uniqueCutoffs.map((date, index) => [
      date.getTime(),
      deltasAtCutoffs[index] ?? {},
    ]),
  );

  return Object.fromEntries(
    NET_WORTH_PERIODS.map((period) => [
      period,
      cutoffsByPeriod[period].map((date) =>
        calculateNetWorthPoint(
          accountsWithBalances,
          date,
          deltasByCutoff.get(date.getTime()) ?? {},
          period,
        ),
      ),
    ]),
  ) as NetWorthHistory;
}

function calculateNetWorthPoint(
  accountRows: AccountWithBalance[],
  date: Date,
  transactionDeltas: Record<string, number>,
  period: NetWorthPeriod,
): NetWorthHistoryPoint {
  let totalAssetsMinorUnits = 0;
  let totalLiabilitiesMinorUnits = 0;

  for (const account of accountRows) {
    if (
      account.isArchived ||
      account.hideFromReports ||
      account.openingBalanceAt.getTime() > date.getTime()
    ) {
      continue;
    }

    const balance =
      account.openingBalanceMinorUnits +
      (transactionDeltas[account.id] ?? 0);
    if (account.accountType?.accountGroup === "liability") {
      totalLiabilitiesMinorUnits += balance;
    } else {
      totalAssetsMinorUnits += balance;
    }
  }

  return {
    date,
    label: date.toLocaleDateString(undefined, {
      month: "short",
      ...(period === "1M" ? { day: "numeric" } : {}),
    }),
    netWorthMinorUnits:
      totalAssetsMinorUnits + totalLiabilitiesMinorUnits,
    totalAssetsMinorUnits,
    totalLiabilitiesMinorUnits,
  };
}

function getPeriodCutoffDates(
  period: NetWorthPeriod,
  targetDate: Date,
): Date[] {
  if (period === "1M") {
    return [28, 21, 14, 7, 0].map((daysAgo) => {
      const date = new Date(targetDate);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(23, 59, 59, 999);
      return date;
    });
  }

  const monthCount = period === "3M" ? 3 : period === "6M" ? 6 : 12;
  return Array.from({ length: monthCount }, (_, index) => {
    const monthsAgo = monthCount - index - 1;
    if (monthsAgo === 0) {
      const current = new Date(targetDate);
      current.setHours(23, 59, 59, 999);
      return current;
    }

    return new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() - monthsAgo + 1,
      0,
      23,
      59,
      59,
      999,
    );
  });
}
