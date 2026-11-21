import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findCategoryById,
  findCategoriesByIds,
  findChildCategories,
  findFirstCategoryByType,
} from "../repositories/categories.repository";
import { DEFAULT_OTHERS_CATEGORY_IDS } from "../constants/categories.constants";

export function requireCategory(id: string, context: DbContext) {
  const category = findCategoryById(id, context);
  if (!category) {
    throw new Error("This category no longer exists. Refresh and try again.");
  }
  return category;
}

export function getCategory(id: string, context: DbContext = db) {
  return findCategoryById(id, context);
}

/** Returns the direct children used when applying a parent category's rules. */
export function getCategoryChildren(parentId: string, context: DbContext = db) {
  return findChildCategories(parentId, context);
}

/** Resolves category metadata for reports without loading unrelated categories. */
export function getCategoriesByIds(ids: string[], context: DbContext = db) {
  return findCategoriesByIds(ids, context);
}

/** Resolves a current expense category after a previously linked category was deleted. */
export function getDefaultExpenseCategoryId(context: DbContext = db): string | null {
  const preferred = findCategoryById(DEFAULT_OTHERS_CATEGORY_IDS.expense, context);
  if (preferred?.type === "expense") return preferred.id;
  return findFirstCategoryByType("expense", context)?.id ?? null;
}
