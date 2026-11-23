import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ZodError } from "zod";
import { useLocalization } from "@/infrastructure/localization";
import { subscribeCategoryChanges } from "../services/category-changes.service";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import { db } from "@/infrastructure/database/client";
import { listCategories } from "../repositories/categories.repository";
import { saveCategory as saveCategoryService } from "../services/save-category.service";
import { deleteCategory as deleteCategoryService } from "../services/delete-category.service";
import { reorderCategories as reorderCategoriesService } from "../services/reorder-categories.service";
import {
  deleteCategoryPresets as deleteCategoryPresetsService,
  loadCategoryPresets as loadCategoryPresetsService,
} from "../services/category-presets.service";
import type { Category, CategoryInput } from "../types/category.types";
import { CategoryError } from "../types/category-error";

type CategoryFailure = {
  cause: unknown;
  fallback: "loadFailed" | "saveFailed" | "deleteFailed" | "reorderFailed" | "loadPresetsFailed" | "deletePresetsFailed";
};

function getCategoryErrorMessage(failure: CategoryFailure, t: ReturnType<typeof useLocalization>["t"]) {
  if (failure.cause instanceof CategoryError) {
    return t(`categories.errors.${failure.cause.code}`, failure.cause.details);
  }
  if (failure.cause instanceof ZodError) {
    const issue = failure.cause.issues[0];
    if (issue?.path[0] === "name" && issue.code === "too_small") return t("categories.errors.nameRequired");
    if (issue?.path[0] === "name" && issue.code === "too_big") return t("categories.errors.nameTooLong");
    return t("categories.errors.invalidDetails");
  }
  return t(`categories.errors.${failure.fallback}`);
}

export interface UseCategoriesOptions {
  skipQuery?: boolean;
}

export function useCategories(options?: UseCategoriesOptions) {
  const { t } = useLocalization();
  const skipQuery = options?.skipQuery ?? false;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(!skipQuery);
  const [saving, setSaving] = useState<boolean>(false);
  const [failure, setFailure] = useState<CategoryFailure | null>(null);
  const focusedRef = useRef(false);
  const requestIdRef = useRef(0);
  const cancelPendingRef = useRef<(() => void) | null>(null);
  const cancelPresetDeletionRef = useRef<(() => void) | null>(null);
  const cancelPending = useCallback(() => {
    ++requestIdRef.current;
    cancelPendingRef.current?.();
    cancelPendingRef.current = null;
  }, []);

  const refresh = useCallback((): Promise<void> => {
    cancelPending();
    if (skipQuery || !focusedRef.current) return Promise.resolve();
    const requestId = requestIdRef.current;
    setLoading(true);
    return new Promise((resolve) => {
      const cancelPaint = scheduleAfterPaint(() => {
        void (async () => {
          try {
            const list = await listCategories(db);
            if (requestId !== requestIdRef.current) return;
            setCategories(list);
            setFailure(null);
          } catch (err: any) {
            if (requestId === requestIdRef.current) {
              setFailure({ cause: err, fallback: "loadFailed" });
            }
          } finally {
            if (requestId === requestIdRef.current) {
              cancelPendingRef.current = null;
              setLoading(false);
            }
            resolve();
          }
        })();
      });
      cancelPendingRef.current = () => { cancelPaint(); resolve(); };
    });
  }, [cancelPending, skipQuery]);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    if (!skipQuery) void refresh();
    const unsubscribe = skipQuery ? undefined : subscribeCategoryChanges(() => { void refresh(); });
    return () => {
      focusedRef.current = false;
      unsubscribe?.();
      cancelPending();
      cancelPresetDeletionRef.current?.();
      cancelPresetDeletionRef.current = null;
    };
  }, [cancelPending, refresh, skipQuery]));

  const save = useCallback(
    async (input: CategoryInput, id?: string): Promise<Category | null> => {
      try {
        setSaving(true);
        setFailure(null);
        const saved = await saveCategoryService(input, id);
        await refresh();
        return saved;
      } catch (err: any) {
        console.error("[useCategories] Save failed:", err);
        setFailure({ cause: err, fallback: "saveFailed" });
        return null;
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
        setFailure(null);
        await deleteCategoryService(id);
        await refresh();
        return true;
      } catch (err: any) {
        console.error("[useCategories] Delete failed:", err);
        setFailure({ cause: err, fallback: "deleteFailed" });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const reorder = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      try {
        setSaving(true);
        setFailure(null);
        await reorderCategoriesService(orderedIds);
        await refresh();
        return true;
      } catch (err: any) {
        console.error("[useCategories] Reorder failed:", err);
        setFailure({ cause: err, fallback: "reorderFailed" });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const loadPresets = useCallback(async (): Promise<boolean> => {
    try {
      setSaving(true);
      setFailure(null);
      await loadCategoryPresetsService();
      await refresh();
      return true;
    } catch (err: any) {
      console.error("[useCategories] Load presets failed:", err);
      setFailure({ cause: err, fallback: "loadPresetsFailed" });
      return false;
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  const removePresets = useCallback(async (): Promise<boolean> => {
    if (cancelPresetDeletionRef.current) return false;
    try {
      setSaving(true);
      setFailure(null);
      const ready = await new Promise<boolean>((resolve) => {
        const cancelPaint = scheduleAfterPaint(() => {
          cancelPresetDeletionRef.current = null;
          resolve(true);
        });
        cancelPresetDeletionRef.current = () => { cancelPaint(); resolve(false); };
      });
      if (!ready) return false;
      await deleteCategoryPresetsService();
      await refresh();
      return true;
    } catch (err: any) {
      console.error("[useCategories] Delete presets failed:", err);
      setFailure({ cause: err, fallback: "deletePresetsFailed" });
      return false;
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  const clearError = useCallback(() => setFailure(null), []);

  return {
    categories,
    loading,
    saving,
    error: failure ? getCategoryErrorMessage(failure, t) : null,
    refresh,
    saveCategory: save,
    deleteCategory: remove,
    reorderCategories: reorder,
    loadCategoryPresets: loadPresets,
    deleteCategoryPresets: removePresets,
    clearError,
  };
}
