import { db, type DbContext } from "@/infrastructure/database/client";
import { getCategory, getCategoryChildren, type Category } from "@/modules/categories";
import { getExchangeRateMap } from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import {
  findCategoryBudgetByCategoryId,
  findEnabledBudgetCategoryIds,
} from "../repositories/category-budgets.repository";
import type { BudgetCheckResult, CategoryBudget } from "../types/budget.types";
import { calculateCategoryBudgetStatus } from "./calculate-category-budget.service";

export interface CheckBudgetExceededInput {
  categoryId: string;
  amountMinorUnits: number; // Positive minor units of the pending expense
  expenseCurrencyCode?: string;
  occurredAt?: Date;
  excludeTransactionId?: string | null;
  context?: DbContext;
  language?: string;
}

export type BudgetLiveSnapshotInput = Omit<
  CheckBudgetExceededInput,
  "amountMinorUnits"
>;

export interface BudgetLiveSnapshot {
  hasBudget: boolean;
  isEnabled: boolean;
  categoryName: string;
  budgetCurrencyCode: string;
  frequency: BudgetCheckResult["frequency"];
  periodLabel: string;
  effectiveBudgetCents: number;
  currentSpentCents: number;
  remainingBeforeCents: number;
  notifyOnExceeded: boolean;
  expenseCurrency: string;
  ratesMap: Map<string, number>;
  budgetId?: string;
  periodKey?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

const EMPTY_RATES = new Map<string, number>();

/**
 * Loads the active budget and period spending baseline from SQLite for a
 * category/date/currency. Pair with `evaluateBudgetSnapshot` so live typing
 * previews run in O(1) JS without re-querying SQLite on every keystroke.
 */
export function getBudgetLiveSnapshot(
  input: BudgetLiveSnapshotInput,
): BudgetLiveSnapshot {
  const {
    categoryId,
    occurredAt = new Date(),
    context = db,
  } = input;

  const noBudgetSnapshot: BudgetLiveSnapshot = {
    hasBudget: false,
    isEnabled: false,
    categoryName: "",
    budgetCurrencyCode: "",
    frequency: "monthly",
    periodLabel: "",
    effectiveBudgetCents: 0,
    currentSpentCents: 0,
    remainingBeforeCents: 0,
    notifyOnExceeded: false,
    expenseCurrency: "",
    ratesMap: EMPTY_RATES,
  };

  if (!categoryId) {
    return noBudgetSnapshot;
  }

  const category = getCategory(categoryId, context);
  if (!category) {
    return noBudgetSnapshot;
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
      ...noBudgetSnapshot,
      categoryName: category.name,
    };
  }

  return getBudgetLiveSnapshotForBudget(budget, budgetedCategory, { ...input, occurredAt, context });
}

/** Reuse a resolved owner so a multi-line expense reads its spending baseline only once. */
export function getBudgetLiveSnapshotForBudget(
  budget: CategoryBudget,
  budgetedCategory: Category,
  input: BudgetLiveSnapshotInput,
): BudgetLiveSnapshot {
  const { occurredAt = new Date(), excludeTransactionId, context = db } = input;
  const childCategories = getCategoryChildren(budgetedCategory.id, context);
  const activeBudgetCategoryIds = findEnabledBudgetCategoryIds(
    childCategories.map((child) => child.id),
    context,
  );

  const status = calculateCategoryBudgetStatus({
    budget,
    category: budgetedCategory,
    childCategories,
    activeBudgetCategoryIds,
    referenceDate: occurredAt,
    excludeTransactionId,
    context,
    language: input.language,
  });

  const expenseCurrency =
    input.expenseCurrencyCode?.trim().toUpperCase() ?? budget.currencyCode;
  const ratesMap =
    expenseCurrency !== budget.currencyCode
      ? getExchangeRateMap(DEFAULT_BASE_CURRENCY, context)
      : EMPTY_RATES;

  let periodScopeSuffix = `${status.periodStart.getFullYear()}-${status.periodStart.getMonth() + 1}`;
  if (
    budget.frequency === "daily" ||
    budget.frequency === "weekly" ||
    budget.frequency === "biweekly" ||
    budget.frequency === "semi_monthly"
  ) {
    periodScopeSuffix = `${status.periodStart.getFullYear()}-${status.periodStart.getMonth() + 1}-${status.periodStart.getDate()}`;
  } else if (budget.frequency === "yearly") {
    periodScopeSuffix = `${status.periodStart.getFullYear()}`;
  }
  const periodKey = `${budget.id}-${periodScopeSuffix}`;

  return {
    hasBudget: true,
    isEnabled: budget.isEnabled,
    categoryName: budgetedCategory.name,
    budgetCurrencyCode: budget.currencyCode,
    frequency: budget.frequency,
    periodLabel: status.periodLabel,
    effectiveBudgetCents: status.effectiveTargetCents,
    currentSpentCents: status.spentCents,
    remainingBeforeCents: status.remainingCents,
    notifyOnExceeded: budget.notifyOnExceeded,
    expenseCurrency,
    ratesMap,
    budgetId: budget.id,
    periodKey,
    periodStart: status.periodStart,
    periodEnd: status.periodEnd,
  };
}

/**
 * Pure O(1) evaluation of a pending expense amount against a pre-fetched
 * `BudgetLiveSnapshot`. Performs zero database queries.
 */
export function evaluateBudgetSnapshot(
  snapshot: BudgetLiveSnapshot,
  amountMinorUnits: number,
): BudgetCheckResult {
  const expenseAmount = Math.max(0, amountMinorUnits);

  if (!snapshot.hasBudget || !snapshot.isEnabled) {
    return {
      hasBudget: snapshot.hasBudget,
      isEnabled: snapshot.isEnabled,
      categoryName: snapshot.categoryName,
      budgetCurrencyCode: snapshot.budgetCurrencyCode,
      frequency: snapshot.frequency,
      periodLabel: snapshot.periodLabel,
      effectiveBudgetCents: 0,
      currentSpentCents: 0,
      additionalExpenseCents: expenseAmount,
      newSpentCents: expenseAmount,
      remainingBeforeCents: 0,
      remainingAfterCents: 0,
      exceeds: false,
      exceededByCents: 0,
      notifyOnExceeded: false,
    };
  }

  const additionalExpenseCents =
    expenseAmount === 0
      ? 0
      : snapshot.expenseCurrency === snapshot.budgetCurrencyCode
        ? expenseAmount
        : convertCurrencyMinorUnits(
            expenseAmount,
            snapshot.expenseCurrency,
            snapshot.budgetCurrencyCode,
            snapshot.ratesMap,
            DEFAULT_BASE_CURRENCY,
          );
  const newSpentCents = snapshot.currentSpentCents + additionalExpenseCents;
  const exceeds = newSpentCents > snapshot.effectiveBudgetCents;
  const exceededByCents = Math.max(
    0,
    newSpentCents - snapshot.effectiveBudgetCents,
  );

  return {
    hasBudget: true,
    isEnabled: snapshot.isEnabled,
    categoryName: snapshot.categoryName,
    budgetCurrencyCode: snapshot.budgetCurrencyCode,
    frequency: snapshot.frequency,
    periodLabel: snapshot.periodLabel,
    effectiveBudgetCents: snapshot.effectiveBudgetCents,
    currentSpentCents: snapshot.currentSpentCents,
    additionalExpenseCents,
    newSpentCents,
    remainingBeforeCents: snapshot.remainingBeforeCents,
    remainingAfterCents: snapshot.effectiveBudgetCents - newSpentCents,
    exceeds,
    exceededByCents,
    notifyOnExceeded: snapshot.notifyOnExceeded,
    budgetId: snapshot.budgetId,
    periodKey: snapshot.periodKey,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
  };
}

/**
 * Checks whether an expense of `amountMinorUnits` will exceed the category's budget
 * (or its parent category's budget).
 */
export function checkBudgetExceeded(
  input: CheckBudgetExceededInput,
): BudgetCheckResult {
  const snapshot = getBudgetLiveSnapshot(input);
  return evaluateBudgetSnapshot(snapshot, input.amountMinorUnits);
}
