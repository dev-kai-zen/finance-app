import { db, type DbContext } from "@/infrastructure/database/client";
import { getCategory } from "@/modules/categories";
import { getExchangeRateMap } from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import {
  findCategoryBudgetByCategoryId,
  listCategoryBudgets,
} from "../repositories/category-budgets.repository";
import type { BudgetCheckResult } from "../types/budget.types";
import { calculateCategoryBudgetStatus } from "./calculate-category-budget.service";

export interface CheckBudgetExceededInput {
  categoryId: string;
  amountMinorUnits: number; // Positive minor units of the pending expense
  expenseCurrencyCode?: string;
  occurredAt?: Date;
  excludeTransactionId?: string | null;
  context?: DbContext;
}

/**
 * Checks whether an expense of `amountMinorUnits` will exceed the category's budget
 * (or its parent category's budget).
 */
export function checkBudgetExceeded(
  input: CheckBudgetExceededInput,
): BudgetCheckResult {
  const {
    categoryId,
    amountMinorUnits,
    occurredAt = new Date(),
    excludeTransactionId,
    context = db,
  } = input;

  const noBudgetResult: BudgetCheckResult = {
    hasBudget: false,
    isEnabled: false,
    categoryName: "",
    budgetCurrencyCode: "",
    frequency: "monthly",
    periodLabel: "",
    effectiveBudgetCents: 0,
    currentSpentCents: 0,
    additionalExpenseCents: Math.abs(amountMinorUnits),
    newSpentCents: Math.abs(amountMinorUnits),
    remainingBeforeCents: 0,
    remainingAfterCents: 0,
    exceeds: false,
    exceededByCents: 0,
    notifyOnExceeded: false,
  };

  if (!categoryId) {
    return noBudgetResult;
  }

  const category = getCategory(categoryId, context);
  if (!category) {
    return noBudgetResult;
  }

  // 1. Try finding budget on this category directly
  let budget = findCategoryBudgetByCategoryId(category.id, context);
  let budgetedCategory = category;

  // 2. If no enabled budget on this category, check parent category
  if ((!budget || !budget.isEnabled) && category.parentId) {
    const parentCategory = getCategory(category.parentId, context);
    if (parentCategory) {
      const parentBudget = findCategoryBudgetByCategoryId(
        parentCategory.id,
        context,
      );
      if (parentBudget && parentBudget.isEnabled) {
        budget = parentBudget;
        budgetedCategory = parentCategory;
      }
    }
  }

  if (!budget || !budget.isEnabled) {
    return {
      ...noBudgetResult,
      categoryName: category.name,
    };
  }

  // Fetch all active budgets so subcategories with their own budgets aren't counted twice
  const allBudgets = listCategoryBudgets(context);
  // Note: listCategoryBudgets is async in definition, let's use direct query or synchronous in SQLite
  // Let's ensure synchronous execution in SQLite client
  const status = calculateCategoryBudgetStatus({
    budget,
    category: budgetedCategory,
    childCategories: budgetedCategory.subcategories || [],
    referenceDate: occurredAt,
    excludeTransactionId,
    context,
  });

  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);
  const expenseCurrency =
    input.expenseCurrencyCode?.trim().toUpperCase() ?? budget.currencyCode;
  const additionalExpenseCents = convertCurrencyMinorUnits(
    Math.abs(amountMinorUnits),
    expenseCurrency,
    budget.currencyCode,
    ratesMap,
    DEFAULT_BASE_CURRENCY,
  );
  const newSpentCents = status.spentCents + additionalExpenseCents;
  const exceeds =
    status.effectiveTargetCents > 0
      ? newSpentCents > status.effectiveTargetCents
      : false;
  const exceededByCents = Math.max(0, newSpentCents - status.effectiveTargetCents);

  return {
    hasBudget: true,
    isEnabled: budget.isEnabled,
    categoryName: budgetedCategory.name,
    budgetCurrencyCode: budget.currencyCode,
    frequency: budget.frequency,
    periodLabel: status.periodLabel,
    effectiveBudgetCents: status.effectiveTargetCents,
    currentSpentCents: status.spentCents,
    additionalExpenseCents,
    newSpentCents,
    remainingBeforeCents: status.remainingCents,
    remainingAfterCents: status.effectiveTargetCents - newSpentCents,
    exceeds,
    exceededByCents,
    notifyOnExceeded: budget.notifyOnExceeded,
  };
}
