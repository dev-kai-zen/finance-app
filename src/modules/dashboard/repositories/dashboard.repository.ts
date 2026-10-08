import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accounts,
  categories,
  transactions,
} from "@/infrastructure/database/schema";
import { getAccountsWithBalances } from "@/modules/accounts";
import {
  getCurrencyPreferences,
  getExchangeRateMap,
} from "@/modules/currencies";
import {
  getAccountBalanceDeltasAtDates,
  getRecentTransactions,
} from "@/modules/transactions";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
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

  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);
  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;

  const allTx = context
    .select({
      type: transactions.type,
      amountCents: transactions.amountCents,
      currencyCode: accounts.currencyCode,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, startOfMonth),
        lte(transactions.occurredAt, endOfMonth),
      ),
    )
    .all();

  let totalInflow = 0;
  let totalOutflow = 0;

  for (const tx of allTx) {
    if (tx.type === "transfer") {
      continue;
    }
    const convertedAmount = convertCurrencyMinorUnits(
      tx.amountCents,
      tx.currencyCode ?? DEFAULT_BASE_CURRENCY,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    if (convertedAmount > 0) {
      totalInflow += convertedAmount;
    } else if (convertedAmount < 0) {
      totalOutflow += Math.abs(convertedAmount);
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

  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);
  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;

  const txRows = context
    .select({
      transaction: transactions,
      category: categories,
      currencyCode: accounts.currencyCode,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, startOfMonth),
        lte(transactions.occurredAt, endOfMonth),
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

  for (const { transaction: tx, category: cat, currencyCode } of txRows) {
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

    const expenseMagnitude = convertCurrencyMinorUnits(
      Math.abs(tx.amountCents),
      currencyCode ?? DEFAULT_BASE_CURRENCY,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    spendingByCategory[catId].total += expenseMagnitude;
    overallExpense += expenseMagnitude;
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

  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);
  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const acc of activeAccounts) {
    const convertedBalance = convertCurrencyMinorUnits(
      acc.currentBalanceMinorUnits,
      acc.currencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    if (acc.accountType?.accountGroup === "liability") {
      totalLiabilities += convertedBalance;
    } else {
      totalAssets += convertedBalance;
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
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);
  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;
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
          ratesMap,
          homeCurrency,
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
  ratesMap?: Map<string, number>,
  homeCurrency: string = DEFAULT_BASE_CURRENCY,
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
    const convertedBalance = convertCurrencyMinorUnits(
      balance,
      account.currencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    if (account.accountType?.accountGroup === "liability") {
      totalLiabilitiesMinorUnits += convertedBalance;
    } else {
      totalAssetsMinorUnits += convertedBalance;
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
