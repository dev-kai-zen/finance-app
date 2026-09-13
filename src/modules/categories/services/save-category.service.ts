import { db, type DbContext } from "@/infrastructure/database/client";
import { categoryInputSchema } from "../schemas/category.schema";
import {
  getCategoryById,
  getCategoryByNameAndType,
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

  // Check duplicate name within the same type
  const existingWithSameName = await getCategoryByNameAndType(
    client,
    parsed.name,
    parsed.type,
  );

  if (existingWithSameName && existingWithSameName.id !== id) {
    throw new Error(`A ${parsed.type} category named "${parsed.name}" already exists.`);
  }

  if (id) {
    const existing = await getCategoryById(client, id);
    if (!existing) {
      throw new Error(`Category not found with ID ${id}`);
    }

    // System categories cannot change their type
    if (existing.isSystem && existing.type !== parsed.type) {
      throw new Error("System categories cannot change their group type.");
    }

    const updated = await updateCategory(client, id, parsed);
    if (!updated) {
      throw new Error(`Failed to update category ${id}`);
    }
    return updated;
  }

  // Create new category
  const newId = generateId();
  return insertCategory(client, {
    ...parsed,
    id: newId,
    isSystem: false,
  });
}
