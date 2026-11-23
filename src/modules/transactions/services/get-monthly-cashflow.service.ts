import { db, type DbContext } from "@/infrastructure/database/client";
import { getCurrencyPreferences, getExchangeRateMap } from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { findCashFlowHistoryRows } from "../repositories/transactions.repository";

export interface MonthlyCashflowSummary {
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netSavingsMinorUnits: number;
  savingsRatePercentage: number;
  monthLabel: string;
}

export function getMonthlyCashflow(
  context: DbContext = db,
  targetDate: Date = new Date(),
): MonthlyCashflowSummary {
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

  const allTx = findCashFlowHistoryRows(startOfMonth, endOfMonth, context);

  let totalInflow = 0;
  let totalOutflow = 0;

  for (const tx of allTx) {
    if (tx.type === "transfer") {
      continue;
    }
    const convertedAmount = convertCurrencyMinorUnits(
      tx.amountMinorUnits,
      tx.accountCurrencyCode ?? DEFAULT_BASE_CURRENCY,
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
