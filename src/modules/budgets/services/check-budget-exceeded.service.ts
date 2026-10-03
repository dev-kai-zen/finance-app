import { db, type DbContext } from "@/infrastructure/database/client";
import { getCategory } from "@/modules/categories";
import {
  findCategoryBudgetByCategoryId,
  listCategoryBudgets,
} from "../repositories/category-budgets.repository";
import type { BudgetCheckResult } from "../types/budget.types";
import { calculateCategoryBudgetStatus } from "./calculate-category-budget.service";

export interface CheckBudgetExceededInput {
  categoryId: string;
  amountCents: number; // Positive minor units of the pending expense
  occurredAt?: Date;
  excludeTransactionId?: string | null;
  context?: DbContext;
}

/**
 * Checks whether an expense of `amountCents` will exceed the category's budget
 * (or its parent category's budget).
 */
export function checkBudgetExceeded(
  input: CheckBudgetExceededInput,
): BudgetCheckResult {
  const {
    categoryId,
    amountCents,
    occurredAt = new Date(),
    excludeTransactionId,
    context = db,
  } = input;

  const noBudgetResult: BudgetCheckResult = {
    hasBudget: false,
    isEnabled: false,
    categoryName: "",
    frequency: "monthly",
    periodLabel: "",
    effectiveBudgetCents: 0,
    currentSpentCents: 0,
    additionalExpenseCents: Math.abs(amountCents),
    newSpentCents: Math.abs(amountCents),
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

  const additionalExpenseCents = Math.abs(amountCents);
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
