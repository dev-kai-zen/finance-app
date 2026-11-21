import { useCallback, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { useFocusEffect } from "expo-router";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { db } from "@/infrastructure/database/client";
import { useCategories, type Category } from "@/modules/categories";
import {
  getCurrencyPreferences,
  getExchangeRateMap,
} from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { listCategoryBudgetsSync } from "../repositories/category-budgets.repository";
import { calculateBudgetStatusesBatch } from "../services/calculate-category-budget.service";
import { deleteCategoryBudget as deleteCategoryBudgetService } from "../services/delete-category-budget.service";
import { saveCategoryBudget as saveCategoryBudgetService } from "../services/save-category-budget.service";
import { toggleCategoryBudget as toggleCategoryBudgetService } from "../services/toggle-category-budget.service";
import type {
  BudgetStatus,
  BudgetsSummary,
  CategoryBudget,
  CategoryBudgetInput,
} from "../types/budget.types";

export type { BudgetsSummary };

function summarizeBudgetStatuses(statuses: BudgetStatus[]): BudgetsSummary {
  if (statuses.length === 0) {
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
  let totalBudgetedCents = 0;
  let totalSpentCents = 0;
  let activeCount = 0;
  let exceededCount = 0;
  let nearLimitCount = 0;
  const homeCurrency = getCurrencyPreferences(db).defaultCurrency;
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, db);

  for (const item of statuses) {
    if (!item.budget.isEnabled) continue;
    activeCount += 1;
    totalBudgetedCents += convertCurrencyMinorUnits(
      item.effectiveTargetCents,
      item.budget.currencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    totalSpentCents += convertCurrencyMinorUnits(
      item.spentCents,
      item.budget.currencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    if (item.isExceeded) exceededCount += 1;
    else if (item.isNearLimit) nearLimitCount += 1;
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

export function useBudgets(referenceDate?: Date, options?: { skipQuery?: boolean }) {
  const skipQuery = options?.skipQuery ?? false;
  const referenceDateMs = referenceDate?.getTime();
  const { categories, loading: categoriesLoading } = useCategories({ skipQuery });
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [summary, setSummary] = useState<BudgetsSummary>(() => summarizeBudgetStatuses([]));
  const focusedRef = useRef(false);
  const requestIdRef = useRef(0);
  const cancelPendingRef = useRef<(() => void) | null>(null);
  const clearError = useCallback(() => setError(null), []);

  // Flatten categories map for quick category lookup
  const flatCategoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    function traverse(cats: Category[]) {
      for (const cat of cats) {
        map.set(cat.id, cat);
        if (cat.subcategories) {
          traverse(cat.subcategories);
        }
      }
    }
    traverse(categories);
    return map;
  }, [categories]);

  const cancelPending = useCallback(() => {
    ++requestIdRef.current;
    cancelPendingRef.current?.();
    cancelPendingRef.current = null;
  }, []);

  const refresh = useCallback((): Promise<void> => {
    cancelPending();
    if (skipQuery || !focusedRef.current || categoriesLoading) return Promise.resolve();
    const requestId = requestIdRef.current;

    return new Promise((resolve) => {
      const cancelQuery = runDeferredSyncQuery(
        { hasCachedResult: false, setLoading },
        () => {
          if (requestId !== requestIdRef.current) return;
          cancelPendingRef.current = null;
          try {
            setError(null);
            const list = listCategoryBudgetsSync(db);
            const statuses = calculateBudgetStatusesBatch(
              list,
              flatCategoriesMap,
              referenceDateMs === undefined ? new Date() : new Date(referenceDateMs),
              db,
            );
            statuses.sort((a, b) => {
              if (a.isExceeded !== b.isExceeded) return a.isExceeded ? -1 : 1;
              if (a.isNearLimit !== b.isNearLimit) return a.isNearLimit ? -1 : 1;
              return b.percentage - a.percentage;
            });
            const nextSummary = summarizeBudgetStatuses(statuses);
            // Commit rows, totals and loading together; never reveal stale totals between stages.
            setBudgets(list);
            setBudgetStatuses(statuses);
            setSummary(nextSummary);
          } catch (err: any) {
            console.error("[useBudgets] Failed to load budgets:", err);
            setError(err?.message ?? "Failed to load budgets.");
          } finally {
            resolve();
          }
        },
      );
      cancelPendingRef.current = () => {
        cancelQuery();
        resolve();
      };
    });
  }, [cancelPending, categoriesLoading, flatCategoriesMap, referenceDateMs, skipQuery]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (skipQuery) return () => { focusedRef.current = false; cancelPending(); };
      void refresh();
      const subscription = DeviceEventEmitter.addListener(
        "FINANCE_APP_TRANSACTION_MUTATED",
        () => { void refresh(); },
      );
      return () => {
        focusedRef.current = false;
        subscription.remove();
        cancelPending();
      };
    }, [cancelPending, refresh, skipQuery]),
  );

  const saveBudget = useCallback(
    async (input: CategoryBudgetInput): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);
        saveCategoryBudgetService(input, db);
        await refresh();
        return true;
      } catch (err: any) {
        console.error("[useBudgets] Save failed:", err);
        setError(err?.message ?? "Failed to save budget.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const toggleBudget = useCallback(
    async (id: string, isEnabled: boolean): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);
        toggleCategoryBudgetService(id, isEnabled, db);
        await refresh();
        return true;
      } catch (err: any) {
        console.error("[useBudgets] Toggle failed:", err);
        setError(err?.message ?? "Failed to update budget status.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const deleteBudget = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);
        deleteCategoryBudgetService(id, db);
        await refresh();
        return true;
      } catch (err: any) {
        console.error("[useBudgets] Delete failed:", err);
        setError(err?.message ?? "Failed to delete budget.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  return {
    budgets,
    budgetStatuses,
    summary,
    categories,
    loading: loading || categoriesLoading,
    saving,
    error,
    clearError,
    refresh,
    saveBudget,
    toggleBudget,
    deleteBudget,
  };
}
