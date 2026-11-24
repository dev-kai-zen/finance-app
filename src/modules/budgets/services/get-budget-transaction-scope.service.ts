import type { Category } from "@/modules/categories";
import type { BudgetStatus, CategoryBudget } from "../types/budget.types";

/** The same category ownership applies to cards and their transaction drill-downs. */
export function getBudgetCategoryIds(
  categoryId: string,
  children: readonly Category[],
  activeBudgetCategoryIds: ReadonlySet<string>,
): string[] {
  const ids = [categoryId];
  for (const child of children) {
    if (!activeBudgetCategoryIds.has(child.id)) ids.push(child.id);
  }
  return ids;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Snapshot the displayed period and ownership without querying during navigation. */
export function getBudgetTransactionScope(
  status: BudgetStatus,
  budgets: readonly CategoryBudget[],
) {
  const activeIds = new Set<string>();
  for (const budget of budgets) {
    if (budget.isEnabled) activeIds.add(budget.categoryId);
  }
  return {
    budgetId: status.budget.id,
    categoryIds: getBudgetCategoryIds(status.category.id, status.category.subcategories ?? [], activeIds),
    dateFrom: localDateKey(status.periodStart),
    dateTo: localDateKey(status.periodEnd),
  };
}
