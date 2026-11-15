import { db, type DbContext } from "@/infrastructure/database/client";
import { listCategoriesSync } from "../repositories/categories.repository";
import { insertImportedCategory } from "../repositories/import-categories.repository";
import { categoryInputSchema } from "../schemas/category.schema";
import type { CategoryInput } from "../types/category.types";

export function getCategoryImportCatalog(context: DbContext = db) {
  return listCategoriesSync(context, { flat: true });
}

export function resolveImportedCategory(input: CategoryInput, context: DbContext): string {
  const value = categoryInputSchema.parse(input);
  const all = listCategoriesSync(context, { flat: true });
  const existing = all.find((c) => c.type === value.type && c.parentId === (value.parentId || null) && c.name.trim().toLowerCase() === value.name.toLowerCase());
  if (existing) return existing.id;
  if (value.parentId && !all.some((c) => c.id === value.parentId && c.type === value.type && !c.parentId)) throw new Error("Invalid parent category.");
  const id = `cat_import_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return insertImportedCategory({ ...value, id, sortOrder: Math.max(-1, ...all.filter((c) => c.type === value.type && c.parentId === (value.parentId || null)).map((c) => c.sortOrder ?? 0)) + 1 }, context);
}
