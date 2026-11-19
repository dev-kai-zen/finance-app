import { db, type DbContext } from "@/infrastructure/database/client";
import { getCategory } from "@/modules/categories";
import { getExchangeRateMap } from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { findCategoryBudgetByCategoryId } from "../repositories/category-budgets.repository";
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
}

const EMPTY_RATES = new Map<string, number>();

/**
 * Queries SQLite once for the active budget and period spend baseline for a
 * category/date/currency. Pair with `evaluateBudgetSnapshot` so live typing
 * previews run in O(1) JS without re-querying SQLite on every keystroke.
 */
export function getBudgetLiveSnapshot(
  input: BudgetLiveSnapshotInput,
): BudgetLiveSnapshot {
  const {
    categoryId,
    occurredAt = new Date(),
    excludeTransactionId,
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

  const status = calculateCategoryBudgetStatus({
    budget,
    category: budgetedCategory,
    childCategories: budgetedCategory.subcategories || [],
    referenceDate: occurredAt,
    excludeTransactionId,
    context,
  });

  const expenseCurrency =
    input.expenseCurrencyCode?.trim().toUpperCase() ?? budget.currencyCode;
  const ratesMap =
    expenseCurrency !== budget.currencyCode
      ? getExchangeRateMap(DEFAULT_BASE_CURRENCY, context)
      : EMPTY_RATES;

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
  const absAmount = Math.abs(amountMinorUnits);

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
      additionalExpenseCents: absAmount,
      newSpentCents: absAmount,
      remainingBeforeCents: 0,
      remainingAfterCents: 0,
      exceeds: false,
      exceededByCents: 0,
      notifyOnExceeded: false,
    };
  }

  const additionalExpenseCents =
    snapshot.expenseCurrency === snapshot.budgetCurrencyCode
      ? absAmount
      : convertCurrencyMinorUnits(
          absAmount,
          snapshot.expenseCurrency,
          snapshot.budgetCurrencyCode,
          snapshot.ratesMap,
          DEFAULT_BASE_CURRENCY,
        );
  const newSpentCents = snapshot.currentSpentCents + additionalExpenseCents;
  const exceeds =
    snapshot.effectiveBudgetCents > 0
      ? newSpentCents > snapshot.effectiveBudgetCents
      : false;
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
