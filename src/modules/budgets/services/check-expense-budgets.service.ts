import { db, type DbContext } from "@/infrastructure/database/client";
import { getCategoriesByIds } from "@/modules/categories";
import { findCategoryBudgetsByCategoryIds } from "../repositories/category-budgets.repository";
import type { BudgetCheckResult } from "../types/budget.types";
import {
  evaluateBudgetSnapshot,
  getBudgetLiveSnapshotForBudget,
} from "./check-budget-exceeded.service";

export interface CheckExpenseBudgetsInput {
  lines: readonly { categoryId: string; amountMinorUnits: number }[];
  expenseCurrencyCode?: string;
  occurredAt?: Date;
  excludeTransactionId?: string | null;
  context?: DbContext;
}

export interface ExpenseBudgetCheckResult extends BudgetCheckResult {
  budgetId: string;
}

/** Assess the complete pending expense once per owning budget, including split siblings. */
export function checkExpenseBudgets(input: CheckExpenseBudgetsInput): ExpenseBudgetCheckResult[] {
  const amountsByCategory = new Map<string, number>();
  for (const line of input.lines) {
    if (!line.categoryId) continue;
    amountsByCategory.set(line.categoryId, (amountsByCategory.get(line.categoryId) ?? 0) + Math.abs(line.amountMinorUnits));
  }
  if (amountsByCategory.size === 0) return [];

  const context = input.context ?? db;
  const categories = getCategoriesByIds([...amountsByCategory.keys()], context);
  if (categories.length === 0) return [];
  const parentIds = [...new Set(categories.flatMap((category) => category.parentId ? [category.parentId] : []))];
  const parents = getCategoriesByIds(parentIds, context);
  const categoriesById = new Map([...categories, ...parents].map((category) => [category.id, category]));
  const budgets = findCategoryBudgetsByCategoryIds([...categoriesById.keys()], context);
  const budgetsByCategory = new Map(budgets.map((budget) => [budget.categoryId, budget]));
  const grouped = new Map<string, { budget: typeof budgets[number]; amountMinorUnits: number }>();

  for (const category of categories) {
    const own = budgetsByCategory.get(category.id);
    const budget = own?.isEnabled ? own : category.parentId ? budgetsByCategory.get(category.parentId) : undefined;
    if (!budget?.isEnabled) continue;
    const amount = amountsByCategory.get(category.id) ?? 0;
    const previous = grouped.get(budget.id);
    if (previous) previous.amountMinorUnits += amount;
    else grouped.set(budget.id, { budget, amountMinorUnits: amount });
  }

  const occurredAt = input.occurredAt ?? new Date();
  const results: ExpenseBudgetCheckResult[] = [];
  for (const { budget, amountMinorUnits } of grouped.values()) {
    const category = categoriesById.get(budget.categoryId);
    if (!category) continue;
    const snapshot = getBudgetLiveSnapshotForBudget(budget, category, {
      categoryId: category.id,
      expenseCurrencyCode: input.expenseCurrencyCode,
      occurredAt,
      excludeTransactionId: input.excludeTransactionId,
      context,
    });
    results.push({ ...evaluateBudgetSnapshot(snapshot, amountMinorUnits), budgetId: budget.id });
  }
  return results;
}
