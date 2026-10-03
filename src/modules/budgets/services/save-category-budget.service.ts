import { db, type DbContext } from "@/infrastructure/database/client";
import { upsertCategoryBudgetInContext } from "../repositories/category-budgets.repository";
import type { CategoryBudget, CategoryBudgetInput } from "../types/budget.types";

export function saveCategoryBudget(
  input: CategoryBudgetInput,
  context: DbContext = db,
): CategoryBudget {
  if (input.amountCents < 0) {
    throw new Error("Budget amount cannot be negative.");
  }
  if (!input.categoryId) {
    throw new Error("A category is required to create a budget.");
  }

  if (input.monthlyTargets) {
    for (const target of input.monthlyTargets) {
      if (target.amountCents < 0) {
        throw new Error("Monthly target amount cannot be negative.");
      }
      if (target.month < 1 || target.month > 12) {
        throw new Error("Month must be between 1 and 12.");
      }
    }
  }

  return context === db
    ? db.transaction((tx) => upsertCategoryBudgetInContext(input, tx))
    : upsertCategoryBudgetInContext(input, context);
}
