import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findCategoryById,
  findChildCategories,
} from "../repositories/categories.repository";

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
