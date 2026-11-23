import { notifyCategoryChanges } from "./category-changes.service";
import { db, type DbContext } from "@/infrastructure/database/client";
import { categoryInputSchema } from "../schemas/category.schema";
import {
  getCategoryById,
  getCategoryByNameAndType,
  getNextCategorySortOrder,
  insertCategory,
  updateCategory,
} from "../repositories/categories.repository";
import type { Category, CategoryInput } from "../types/category.types";

function generateId(): string {
  return "cat_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export async function saveCategory(
  input: CategoryInput,
  id?: string,
  client: DbContext = db,
): Promise<Category> {
  const parsed = categoryInputSchema.parse(input);

  const existing = id ? await getCategoryById(client, id) : null;
  if (id && !existing) {
    throw new Error(`Category not found with ID ${id}`);
  }
  const parentId =
    parsed.parentId === undefined ? existing?.parentId ?? null : parsed.parentId;

  // Check duplicate name within the same type and parent scope
  const existingWithSameName = await getCategoryByNameAndType(
    client,
    parsed.name,
    parsed.type,
    parentId,
    id,
  );

  if (existingWithSameName) {
    throw new Error(`A ${parsed.type} category named "${parsed.name}" already exists.`);
  }

  if (id && existing) {
    // System categories cannot change their type
    if (existing.isSystem && existing.type !== parsed.type) {
      throw new Error("System categories cannot change their group type.");
    }

    const updated = await updateCategory(client, id, parsed);
    if (!updated) {
      throw new Error(`Failed to update category ${id}`);
    }
    if (client === db) notifyCategoryChanges();
    return updated;
  }

  // Create new category
  const newId = generateId();
  let sortOrder = parsed.sortOrder;
  if (sortOrder === undefined) {
    sortOrder = await getNextCategorySortOrder(
      client,
      parsed.type,
      parsed.parentId ?? null,
    );
  }

  const created = await insertCategory(client, {
    ...parsed,
    id: newId,
    sortOrder,
    isSystem: false,
  });
  if (client === db) notifyCategoryChanges();
  return created;
}
