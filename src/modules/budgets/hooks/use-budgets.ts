import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
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
import {
  findCategoryBudgetByCategoryId,
  listCategoryBudgets,
} from "../repositories/category-budgets.repository";
import {
  calculateCategoryBudgetStatus,
  calculateBudgetStatusesBatch,
} from "../services/calculate-category-budget.service";
import { deleteCategoryBudget as deleteCategoryBudgetService } from "../services/delete-category-budget.service";
import { saveCategoryBudget as saveCategoryBudgetService } from "../services/save-category-budget.service";
import { toggleCategoryBudget as toggleCategoryBudgetService } from "../services/toggle-category-budget.service";
import type {
  BudgetFrequency,
  BudgetStatus,
  BudgetsSummary,
  CategoryBudget,
  CategoryBudgetInput,
} from "../types/budget.types";

export type { BudgetsSummary };

export function useBudgets(referenceDate?: Date) {
  const defaultReferenceDate = useMemo(() => new Date(), []);
  const effectiveReferenceDate = referenceDate ?? defaultReferenceDate;
  const { categories, loading: categoriesLoading } = useCategories();
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      setError(null);
      const list = await listCategoryBudgets(db);
      setBudgets(list);
    } catch (err: any) {
      console.error("[useBudgets] Failed to load budgets:", err);
      setError(err?.message ?? "Failed to load budgets.");
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cancelPaint = scheduleAfterPaint(() => {
      void refresh();
    });
    return cancelPaint;
  }, [refresh]);

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

  // Calculate statuses for all budgets
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [statusesReady, setStatusesReady] = useState(false);

  useEffect(() => {
    if (!budgets.length || !flatCategoriesMap.size) {
      setBudgetStatuses([]);
      if (!loading && !categoriesLoading) {
        setStatusesReady(true);
      }
      return;
    }

    let cancelled = false;
    const cancelPaint = scheduleAfterPaint(() => {
      if (cancelled) return;
      const statuses = calculateBudgetStatusesBatch(
        budgets,
        flatCategoriesMap,
        effectiveReferenceDate,
        db,
      );

      // Sort by status: exceeded first, then near limit, then by percentage descending
      statuses.sort((a, b) => {
        if (a.isExceeded !== b.isExceeded) {
          return a.isExceeded ? -1 : 1;
        }
        if (a.isNearLimit !== b.isNearLimit) {
          return a.isNearLimit ? -1 : 1;
        }
        return b.percentage - a.percentage;
      });

      setBudgetStatuses(statuses);
      setStatusesReady(true);
    });

    return () => {
      cancelled = true;
      cancelPaint();
    };
  }, [budgets, flatCategoriesMap, effectiveReferenceDate, loading, categoriesLoading]);

  // Summary calculations
  const summary = useMemo<BudgetsSummary>(() => {
    if (budgetStatuses.length === 0) {
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

    for (const item of budgetStatuses) {
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
  }, [budgetStatuses]);

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
    loading: loading || categoriesLoading || !statusesReady,
    saving,
    error,
    refresh,
    saveBudget,
    toggleBudget,
    deleteBudget,
  };
}
