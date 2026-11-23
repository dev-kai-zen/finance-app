import { notifyCategoryChanges } from "./category-changes.service";
import { db, type AppDatabase, type DbContext } from "@/infrastructure/database/client";
import {
  deleteCategory as repoDeleteCategory,
  getCategoryById,
  hasSubcategories,
} from "../repositories/categories.repository";
import { isProtectedCategoryId } from "../constants/categories.constants";
import { invalidateChatKeywordsCache } from "@/modules/chat-with-kai";
import { reassignTransactionCategoryReferences } from "@/modules/transactions";
import { reassignScheduledTransactionCategoryReferences } from "@/modules/scheduled-transactions";

export async function deleteCategory(
  id: string,
  client: AppDatabase = db,
): Promise<boolean> {
  const existing = await getCategoryById(client, id);
  if (!existing) {
    throw new Error("Category not found.");
  }

  if (isProtectedCategoryId(existing.id)) {
    throw new Error("System default categories are protected and cannot be deleted.");
  }

  if (await hasSubcategories(client, id)) {
    throw new Error(
      "Cannot delete a category group while it has subcategories. Delete the subcategories first, then try again.",
    );
  }

  const fallbackId =
    existing.parentId ??
    (existing.type === "income" ? "cat_inc_others" : "cat_exp_others");

  await client.transaction(async (tx) => {
    const dbContext = tx as unknown as DbContext;
    // Subcategory transactions and split entries return to their parent group.
    // Top-level group transactions return to the protected "Other" category.
    reassignTransactionCategoryReferences(id, fallbackId, dbContext);
    reassignScheduledTransactionCategoryReferences(id, fallbackId, dbContext);

    const deleted = await repoDeleteCategory(tx, id);
    if (!deleted) {
      throw new Error(`Failed to delete category ${id}`);
    }
  });

  invalidateChatKeywordsCache();
  if (client === db) notifyCategoryChanges();
  return true;
}
