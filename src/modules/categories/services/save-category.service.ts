import { notifyCategoryChanges } from "./category-changes.service";
import { db, type DbContext } from "@/infrastructure/database/client";
import { categoryInputSchema } from "../schemas/category.schema";
import {
  getCategoryById,
  getCategoryByNameAndType,
  getNextCategorySortOrder,
  hasSubcategories,
  insertCategory,
  updateCategory,
} from "../repositories/categories.repository";
import type { Category, CategoryInput } from "../types/category.types";
import { CategoryError } from "../types/category-error";

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
    throw new CategoryError("notFound", `Category not found with ID ${id}`);
  }
  const parentId =
    parsed.parentId === undefined ? existing?.parentId ?? null : parsed.parentId;

  if (id && parentId === id) {
    throw new CategoryError("selfParent", "A category cannot be its own parent.");
  }
  if (existing?.isSystem && existing.type !== parsed.type) {
    throw new CategoryError("systemType", "System categories cannot change their group type.");
  }
  if (existing?.isSystem && parentId !== null) {
    throw new CategoryError("systemParent", "System categories must remain top-level groups.");
  }
  if (parentId !== null) {
    const parent = await getCategoryById(client, parentId);
    if (!parent) {
      throw new CategoryError("parentNotFound", "The parent category no longer exists.");
    }
    if (parent.parentId !== null) {
      throw new CategoryError("parentNotGroup", "Subcategories must belong to a top-level category group.");
    }
    if (parent.type !== parsed.type) {
      throw new CategoryError("parentType", "A subcategory must have the same type as its parent group.");
    }
  }
  if (
    existing &&
    (parentId !== null || existing.type !== parsed.type) &&
    await hasSubcategories(client, existing.id)
  ) {
    throw parentId !== null
      ? new CategoryError("groupHasChildren", "A category group with subcategories cannot become a subcategory.")
      : new CategoryError("groupTypeHasChildren", "A category group with subcategories cannot change its type.");
  }

  // Check duplicate name within the same type and parent scope
  const existingWithSameName = await getCategoryByNameAndType(
    client,
    parsed.name,
    parsed.type,
    parentId,
    id,
  );

  if (existingWithSameName) {
    throw new CategoryError(
      "duplicateName",
      `A ${parsed.type} category named "${parsed.name}" already exists.`,
      { name: parsed.name },
    );
  }

  if (id && existing) {
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
