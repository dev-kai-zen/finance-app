import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findCategoryById,
  findCategoriesByIds,
  findChildCategories,
  findFirstCategoryByType,
  listCategoriesSync,
} from "../repositories/categories.repository";
import { DEFAULT_OTHERS_CATEGORY_IDS } from "../constants/categories.constants";
import type { Category } from "../types/category.types";

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

/** Lists all categories (hierarchical or flat) synchronously with DbContext support. */
export function getCategoryCatalog(
  context: DbContext = db,
  options?: { flat?: boolean },
): Category[] {
  return listCategoriesSync(context, options);
}

/** Returns an O(1) Map of all categories keyed by ID (with subcategories populated) with DbContext support. */
export function getCategoryCatalogMap(context: DbContext = db): Map<string, Category> {
  const hierarchical = listCategoriesSync(context);
  const map = new Map<string, Category>();
  function traverse(cats: Category[]) {
    for (const cat of cats) {
      map.set(cat.id, cat);
      if (cat.subcategories) {
        traverse(cat.subcategories);
      }
    }
  }
  traverse(hierarchical);
  return map;
}
