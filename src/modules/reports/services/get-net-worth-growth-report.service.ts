import { db, type DbContext } from "@/infrastructure/database/client";
import { getAccountsWithBalances } from "@/modules/accounts";
import {
  getCurrencyPreferences,
  getExchangeRateMap,
} from "@/modules/currencies";
import { getAccountBalanceDeltasAtDates } from "@/modules/transactions";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
  formatCurrency,
} from "@/utils/currency";
import { REPORT_COLORS } from "../constants/reports.constants";
import type {
  NetWorthGrowthDateRange,
  NetWorthGrowthReportData,
  NetWorthPoint,
} from "../types/net-worth-growth.types";
import { getHistoricalCutoffDates } from "../utils/net-worth-dates";

export function getNetWorthGrowthReport(
  range: NetWorthGrowthDateRange,
  context: DbContext = db,
): NetWorthGrowthReportData {
  const accountsWithBalances = getAccountsWithBalances(context);
  const activeAccounts = accountsWithBalances.filter(
    (a) => !a.isArchived && !a.hideFromReports,
  );

  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);
  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;
  const cutoffDates = getHistoricalCutoffDates(range.startDate, range.endDate);
  const deltasAtCutoffs = getAccountBalanceDeltasAtDates(cutoffDates, context);

  const rawPoints = cutoffDates.map((date, index) => {
    const deltas = deltasAtCutoffs[index] ?? {};
    const cutoffTime = date.getTime();

    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const acc of activeAccounts) {
      if (acc.openingBalanceAt.getTime() > cutoffTime) continue;

      const delta = deltas[acc.id] ?? 0;
      const balance = acc.openingBalanceMinorUnits + delta;
      const convertedBalance = convertCurrencyMinorUnits(
        balance,
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

    const netWorth = totalAssets + totalLiabilities;
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    return {
      date,
      label,
      totalAssets,
      totalLiabilities,
      netWorth,
    };
  });

  const points: NetWorthPoint[] = [];

  let peak = rawPoints.length > 0 ? rawPoints[0].netWorth : 0;
  let lowest = rawPoints.length > 0 ? rawPoints[0].netWorth : 0;

  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    const prevPt = i > 0 ? rawPoints[i - 1] : null;

    if (pt.netWorth > peak) peak = pt.netWorth;
    if (pt.netWorth < lowest) lowest = pt.netWorth;

    const diff = prevPt ? pt.netWorth - prevPt.netWorth : 0;

    let symbol: "▲" | "▼" | "" = "";
    let color: string = REPORT_COLORS.neutralMuted;
    let formattedDiff = formatCurrency(0, homeCurrency);

    if (diff > 0) {
      symbol = "▲";
      color = REPORT_COLORS.positiveGreen;
      formattedDiff = formatCurrency(diff, homeCurrency, true);
    } else if (diff < 0) {
      symbol = "▼";
      color = REPORT_COLORS.negativeRed;
      formattedDiff = formatCurrency(diff, homeCurrency);
    }

    points.push({
      date: pt.date,
      label: pt.label,
      netWorthMinorUnits: pt.netWorth,
      totalAssetsMinorUnits: pt.totalAssets,
      totalLiabilitiesMinorUnits: pt.totalLiabilities,
      diffFromPriorMinorUnits: diff,
      symbol,
      color,
      formattedNetWorth: formatCurrency(pt.netWorth, homeCurrency),
      formattedDiff,
    });
  }

  const startingPoint = points[0];
  const currentPoint = points[points.length - 1];

  const currentNetWorth = currentPoint ? currentPoint.netWorthMinorUnits : 0;
  const startingNetWorth = startingPoint ? startingPoint.netWorthMinorUnits : 0;
  const periodChange = currentNetWorth - startingNetWorth;
  const periodChangePercentage =
    startingNetWorth !== 0
      ? Math.round((periodChange / Math.abs(startingNetWorth)) * 100)
      : null;

  return {
    range,
    currentNetWorthMinorUnits: currentNetWorth,
    startingNetWorthMinorUnits: startingNetWorth,
    periodChangeMinorUnits: periodChange,
    periodChangePercentage,
    peakNetWorthMinorUnits: peak,
    lowestNetWorthMinorUnits: lowest,
    points,
  };
}
