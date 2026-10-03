import type { DbContext } from "@/infrastructure/database/client";
import type { Category } from "@/modules/categories";
import { getCategoryExpenseTotal } from "@/modules/transactions";
import type {
  BudgetStatus,
  CategoryBudget,
} from "../types/budget.types";
import { getBudgetPeriodInfo } from "../utils/budget-period";

export interface CalculateBudgetOptions {
  budget: CategoryBudget;
  category: Category;
  childCategories?: Category[];
  activeBudgetCategoryIds?: Set<string>;
  referenceDate?: Date;
  excludeTransactionId?: string | null;
  context?: DbContext;
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
  );

  // Collect category IDs to include in spending calculations.
  // Include parent category ID and any subcategories that don't have their own active budget.
  const categoryIds = [category.id];
  for (const child of childCategories) {
    if (!activeBudgetCategoryIds.has(child.id)) {
      categoryIds.push(child.id);
    }
  }

  // 1. Determine base target for current period
  let baseTargetCents = budget.amountCents;
  if (budget.frequency === "custom_monthly" && budget.monthlyTargets) {
    const year = period.startDate.getFullYear();
    const month = period.startDate.getMonth() + 1;
    const target = budget.monthlyTargets.find(
      (t) => t.year === year && t.month === month,
    );
    if (target) {
      baseTargetCents = target.amountCents;
    }
  }

  // 2. Rollover calculation from previous period
  let rolloverCents = 0;
  if (budget.allowRollover) {
    let previousTargetCents = budget.amountCents;
    if (budget.frequency === "custom_monthly" && budget.monthlyTargets) {
      const prevYear = period.previousStartDate.getFullYear();
      const prevMonth = period.previousStartDate.getMonth() + 1;
      const prevTarget = budget.monthlyTargets.find(
        (t) => t.year === prevYear && t.month === prevMonth,
      );
      if (prevTarget) {
        previousTargetCents = prevTarget.amountCents;
      }
    }

    const previousSpent = getCategoryExpenseTotal(
      {
        categoryIds,
        startDate: period.previousStartDate,
        endDate: period.previousEndDate,
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
  const spentCents = getCategoryExpenseTotal(
    {
      categoryIds,
      startDate: period.startDate,
      endDate: period.endDate,
      excludeTransactionId,
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
