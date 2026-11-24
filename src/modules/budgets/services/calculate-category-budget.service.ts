import type { DbContext } from "@/infrastructure/database/client";
import type { Category } from "@/modules/categories";
import {
  getCategoryExpenseTotal,
  getCategoryExpenseTotalsGrouped,
} from "@/modules/transactions";
import type {
  BudgetStatus,
  CategoryBudget,
} from "../types/budget.types";
import { getBudgetPeriodInfo } from "../utils/budget-period";
import { getBudgetCategoryIds } from "./get-budget-transaction-scope.service";

export interface CalculateBudgetOptions {
  budget: CategoryBudget;
  category: Category;
  childCategories?: Category[];
  activeBudgetCategoryIds?: Set<string>;
  referenceDate?: Date;
  excludeTransactionId?: string | null;
  context?: DbContext;
  precomputedSpent?: number;
  precomputedPreviousSpent?: number;
  language?: string;
}

/**
 * Calculates current period status, spending, targets, and rollovers
 * for a category budget.
 */
export function calculateCategoryBudgetStatus(
  options: CalculateBudgetOptions,
): BudgetStatus {
  const {
    budget,
    category,
    childCategories = [],
    activeBudgetCategoryIds = new Set<string>(),
    referenceDate = new Date(),
    excludeTransactionId,
    context,
  } = options;

  const period = getBudgetPeriodInfo(
    budget.frequency,
    referenceDate,
    budget.startDate,
    options.language,
  );

  // Collect category IDs to include in spending calculations.
  // Include parent category ID and any subcategories that don't have their own active budget.
  const categoryIds = getBudgetCategoryIds(category.id, childCategories, activeBudgetCategoryIds);

  // 1. Determine base target for current period
  let baseTargetCents = budget.amountMinorUnits;
  if (budget.frequency === "custom_monthly" && budget.monthlyTargets) {
    const year = period.startDate.getFullYear();
    const month = period.startDate.getMonth() + 1;
    const target = budget.monthlyTargets.find(
      (t) => t.year === year && t.month === month,
    );
    if (target) {
      baseTargetCents = target.amountMinorUnits;
    }
  }

  // 2. Rollover calculation from previous period
  let rolloverCents = 0;
  if (budget.allowRollover) {
    let previousTargetCents = budget.amountMinorUnits;
    if (budget.frequency === "custom_monthly" && budget.monthlyTargets) {
      const prevYear = period.previousStartDate.getFullYear();
      const prevMonth = period.previousStartDate.getMonth() + 1;
      const prevTarget = budget.monthlyTargets.find(
        (t) => t.year === prevYear && t.month === prevMonth,
      );
      if (prevTarget) {
        previousTargetCents = prevTarget.amountMinorUnits;
      }
    }

    const previousSpent =
      options.precomputedPreviousSpent !== undefined
        ? options.precomputedPreviousSpent
        : getCategoryExpenseTotal(
            {
              categoryIds,
              startDate: period.previousStartDate,
              endDate: period.previousEndDate,
              excludeTransactionId,
              targetCurrencyCode: budget.currencyCode,
            },
            context,
          );

    const netPrevious = previousTargetCents - previousSpent;
    if (budget.rolloverMode === "positive_only") {
      rolloverCents = Math.max(0, netPrevious);
    } else {
      rolloverCents = netPrevious;
    }
  }

  // 3. Effective target
  const effectiveTargetCents = Math.max(0, baseTargetCents + rolloverCents);

  // 4. Current period spending
  const spentCents =
    options.precomputedSpent !== undefined
      ? options.precomputedSpent
      : getCategoryExpenseTotal(
          {
            categoryIds,
            startDate: period.startDate,
            endDate: period.endDate,
            excludeTransactionId,
            targetCurrencyCode: budget.currencyCode,
          },
          context,
        );

  // 5. Metrics
  const remainingCents = effectiveTargetCents - spentCents;
  const percentage =
    effectiveTargetCents > 0
      ? Math.round((spentCents / effectiveTargetCents) * 100)
      : spentCents > 0
        ? 100
        : 0;
  const isExceeded = spentCents > effectiveTargetCents;
  const isNearLimit = percentage >= 85 && !isExceeded;

  return {
    budget,
    category,
    periodStart: period.startDate,
    periodEnd: period.endDate,
    periodLabel: period.periodLabel,
    baseTargetCents,
    rolloverCents,
    effectiveTargetCents,
    spentCents,
    remainingCents,
    percentage,
    isExceeded,
    isNearLimit,
  };
}

/**
 * Calculates budget statuses in bulk for an array of budgets.
 * Batches spending queries by period and currency code using getCategoryExpenseTotalsGrouped,
 * replacing N distinct queries with 1-2 grouped SQL queries.
 */
export function calculateBudgetStatusesBatch(
  budgets: CategoryBudget[],
  flatCategoriesMap: Map<string, Category>,
  referenceDate: Date = new Date(),
  context?: DbContext,
  language: string = "en",
): BudgetStatus[] {
  if (budgets.length === 0) return [];

  const activeBudgetCategoryIds = new Set(
    budgets.filter((b) => b.isEnabled).map((b) => b.categoryId),
  );

  const currentGroupMap = new Map<
    string,
    { startDate: Date; endDate: Date; currencyCode: string; categoryIds: Set<string> }
  >();
  const previousGroupMap = new Map<
    string,
    { startDate: Date; endDate: Date; currencyCode: string; categoryIds: Set<string> }
  >();

  for (const budget of budgets) {
    const category = flatCategoriesMap.get(budget.categoryId);
    if (!category) continue;

    const period = getBudgetPeriodInfo(budget.frequency, referenceDate, budget.startDate);
    const currKey = `${period.startDate.getTime()}:${period.endDate.getTime()}:${budget.currencyCode.toUpperCase()}`;

    let currGroup = currentGroupMap.get(currKey);
    if (!currGroup) {
      currGroup = {
        startDate: period.startDate,
        endDate: period.endDate,
        currencyCode: budget.currencyCode,
        categoryIds: new Set<string>(),
      };
      currentGroupMap.set(currKey, currGroup);
    }
    for (const id of getBudgetCategoryIds(category.id, category.subcategories ?? [], activeBudgetCategoryIds)) {
      currGroup.categoryIds.add(id);
    }

    if (budget.allowRollover) {
      const prevKey = `${period.previousStartDate.getTime()}:${period.previousEndDate.getTime()}:${budget.currencyCode.toUpperCase()}`;
      let prevGroup = previousGroupMap.get(prevKey);
      if (!prevGroup) {
        prevGroup = {
          startDate: period.previousStartDate,
          endDate: period.previousEndDate,
          currencyCode: budget.currencyCode,
          categoryIds: new Set<string>(),
        };
        previousGroupMap.set(prevKey, prevGroup);
      }
      for (const id of getBudgetCategoryIds(category.id, category.subcategories ?? [], activeBudgetCategoryIds)) {
        prevGroup.categoryIds.add(id);
      }
    }
  }

  const currentTotalsByGroup = new Map<string, Record<string, number>>();
  for (const [key, group] of currentGroupMap) {
    const totals = getCategoryExpenseTotalsGrouped(
      {
        categoryIds: Array.from(group.categoryIds),
        startDate: group.startDate,
        endDate: group.endDate,
        targetCurrencyCode: group.currencyCode,
      },
      context,
    );
    currentTotalsByGroup.set(key, totals);
  }

  const previousTotalsByGroup = new Map<string, Record<string, number>>();
  for (const [key, group] of previousGroupMap) {
    const totals = getCategoryExpenseTotalsGrouped(
      {
        categoryIds: Array.from(group.categoryIds),
        startDate: group.startDate,
        endDate: group.endDate,
        targetCurrencyCode: group.currencyCode,
      },
      context,
    );
    previousTotalsByGroup.set(key, totals);
  }

  const statuses: BudgetStatus[] = [];

  for (const budget of budgets) {
    const category = flatCategoriesMap.get(budget.categoryId);
    if (!category) continue;

    const period = getBudgetPeriodInfo(budget.frequency, referenceDate, budget.startDate, language);
    const currKey = `${period.startDate.getTime()}:${period.endDate.getTime()}:${budget.currencyCode.toUpperCase()}`;
    const currTotals = currentTotalsByGroup.get(currKey) ?? {};

    const catIds = getBudgetCategoryIds(category.id, category.subcategories ?? [], activeBudgetCategoryIds);

    const precomputedSpent = catIds.reduce((sum, id) => sum + (currTotals[id] ?? 0), 0);

    let precomputedPreviousSpent: number | undefined;
    if (budget.allowRollover) {
      const prevKey = `${period.previousStartDate.getTime()}:${period.previousEndDate.getTime()}:${budget.currencyCode.toUpperCase()}`;
      const prevTotals = previousTotalsByGroup.get(prevKey) ?? {};
      precomputedPreviousSpent = catIds.reduce((sum, id) => sum + (prevTotals[id] ?? 0), 0);
    }

    statuses.push(
      calculateCategoryBudgetStatus({
        budget,
        category,
        childCategories: category.subcategories || [],
        activeBudgetCategoryIds,
        referenceDate,
        context,
        precomputedSpent,
        precomputedPreviousSpent,
        language,
      }),
    );
  }

  return statuses;
}
