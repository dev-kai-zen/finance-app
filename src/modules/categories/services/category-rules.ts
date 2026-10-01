import type { DbContext } from "@/infrastructure/database/client";
import { findCategoryById } from "../repositories/categories.repository";

export function requireCategory(id: string, context: DbContext) {
  const category = findCategoryById(id, context);
  if (!category) {
    throw new Error("This category no longer exists. Refresh and try again.");
  }
  return category;
}

