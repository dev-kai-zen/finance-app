import { useCallback, useEffect, useState } from "react";
import { db } from "@/infrastructure/database/client";
import { listCategories } from "../repositories/categories.repository";
import { saveCategory as saveCategoryService } from "../services/save-category.service";
import { deleteCategory as deleteCategoryService } from "../services/delete-category.service";
import type { Category, CategoryInput } from "../types/category.types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listCategories(db);
      setCategories(list);
    } catch (err: any) {
      console.error("[useCategories] Failed to load categories:", err);
      setError(err?.message ?? "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: CategoryInput, id?: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);
        await saveCategoryService(input, id);
        await refresh();
        return true;
      } catch (err: any) {
        console.error("[useCategories] Save failed:", err);
        setError(err?.message ?? "Failed to save category.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);
        await deleteCategoryService(id);
        await refresh();
        return true;
      } catch (err: any) {
        console.error("[useCategories] Delete failed:", err);
        setError(err?.message ?? "Failed to delete category.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    categories,
    loading,
    saving,
    error,
    refresh,
    saveCategory: save,
    deleteCategory: remove,
    clearError,
  };
}
