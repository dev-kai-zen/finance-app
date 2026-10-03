import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/infrastructure/database/client";
import { useCategories, type Category } from "@/modules/categories";
import {
  findCategoryBudgetByCategoryId,
  listCategoryBudgets,
} from "../repositories/category-budgets.repository";
import { calculateCategoryBudgetStatus } from "../services/calculate-category-budget.service";
import { deleteCategoryBudget as deleteCategoryBudgetService } from "../services/delete-category-budget.service";
import { saveCategoryBudget as saveCategoryBudgetService } from "../services/save-category-budget.service";
import { toggleCategoryBudget as toggleCategoryBudgetService } from "../services/toggle-category-budget.service";
import type {
  BudgetFrequency,
  BudgetStatus,
  CategoryBudget,
  CategoryBudgetInput,
} from "../types/budget.types";

export interface BudgetsSummary {
  totalBudgetedCents: number;
  totalSpentCents: number;
  totalRemainingCents: number;
  overallPercentage: number;
  activeCount: number;
  exceededCount: number;
  nearLimitCount: number;
}

export function useBudgets(referenceDate: Date = new Date()) {
  const { categories, loading: categoriesLoading } = useCategories();
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listCategoryBudgets(db);
      setBudgets(list);
    } catch (err: any) {
      console.error("[useBudgets] Failed to load budgets:", err);
      setError(err?.message ?? "Failed to load budgets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
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
  const budgetStatuses = useMemo<BudgetStatus[]>(() => {
    if (!budgets.length || !flatCategoriesMap.size) return [];

    const activeBudgetCategoryIds = new Set(
      budgets.filter((b) => b.isEnabled).map((b) => b.categoryId),
    );

    const statuses: BudgetStatus[] = [];

    for (const budget of budgets) {
      const category = flatCategoriesMap.get(budget.categoryId);
      if (!category) continue;

      const status = calculateCategoryBudgetStatus({
        budget,
        category,
        childCategories: category.subcategories || [],
        activeBudgetCategoryIds,
        referenceDate,
        context: db,
      });

      statuses.push(status);
    }

    // Sort by status: exceeded first, then near limit, then by percentage descending
    return statuses.sort((a, b) => {
      if (a.isExceeded !== b.isExceeded) {
        return a.isExceeded ? -1 : 1;
      }
      if (a.isNearLimit !== b.isNearLimit) {
        return a.isNearLimit ? -1 : 1;
      }
      return b.percentage - a.percentage;
    });
  }, [budgets, flatCategoriesMap, referenceDate]);

  // Summary calculations
  const summary = useMemo<BudgetsSummary>(() => {
    let totalBudgetedCents = 0;
    let totalSpentCents = 0;
    let activeCount = 0;
    let exceededCount = 0;
    let nearLimitCount = 0;

    for (const item of budgetStatuses) {
      if (!item.budget.isEnabled) continue;
      activeCount += 1;
      totalBudgetedCents += item.effectiveTargetCents;
      totalSpentCents += item.spentCents;
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
    loading: loading || categoriesLoading,
    saving,
    error,
    refresh,
    saveBudget,
    toggleBudget,
    deleteBudget,
  };
}
