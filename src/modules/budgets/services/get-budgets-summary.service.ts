import type { DbContext } from "@/infrastructure/database/client";
import { db as defaultDb } from "@/infrastructure/database/client";
import { getCategoryCatalogMap, type Category } from "@/modules/categories";
import {
  getCurrencyPreferences,
  getExchangeRateMap,
} from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { listCategoryBudgetsSync } from "../repositories/category-budgets.repository";
import { calculateBudgetStatusesBatch } from "./calculate-category-budget.service";
import type { BudgetsSummary } from "../types/budget.types";

/**
 * Calculates the overall budgets summary synchronously from local database.
 */
export function getBudgetsSummary(
  referenceDate: Date = new Date(),
  context: DbContext = defaultDb,
): BudgetsSummary {
  const budgets = listCategoryBudgetsSync(context);
  if (!budgets.length) {
    return {
      totalBudgetedCents: 0,
      totalSpentCents: 0,
      totalRemainingCents: 0,
      overallPercentage: 0,
      activeCount: 0,
      exceededCount: 0,
      nearLimitCount: 0,
    };
  }

  const flatCategoriesMap = getCategoryCatalogMap(context);

  const statuses = calculateBudgetStatusesBatch(
    budgets,
    flatCategoriesMap,
    referenceDate,
    context,
  );

  let totalBudgetedCents = 0;
  let totalSpentCents = 0;
  let activeCount = 0;
  let exceededCount = 0;
  let nearLimitCount = 0;
  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);

  for (const status of statuses) {
    if (!status.budget.isEnabled) continue;

    activeCount += 1;
    totalBudgetedCents += convertCurrencyMinorUnits(
      status.effectiveTargetCents,
      status.budget.currencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    totalSpentCents += convertCurrencyMinorUnits(
      status.spentCents,
      status.budget.currencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );

    if (status.isExceeded) exceededCount += 1;
    else if (status.isNearLimit) nearLimitCount += 1;
  }

  const totalRemainingCents = totalBudgetedCents - totalSpentCents;
  const overallPercentage =
    totalBudgetedCents > 0
      ? Math.round((totalSpentCents / totalBudgetedCents) * 100)
      : 0;

  return {
    totalBudgetedCents,
    totalSpentCents,
    totalRemainingCents,
    overallPercentage,
    activeCount,
    exceededCount,
    nearLimitCount,
  };
}
