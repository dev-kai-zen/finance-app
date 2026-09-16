import { eq } from "drizzle-orm";
import { db, type AppDatabase } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema/transactions";
import {
  deleteCategory as repoDeleteCategory,
  getCategoryById,
  hasSubcategories,
} from "../repositories/categories.repository";
import { isProtectedCategoryId } from "../constants/categories.constants";

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
    // Subcategory transactions return to their parent group. Top-level group
    // transactions return to the protected "Other" category.
    await tx
      .update(transactions)
      .set({ categoryId: fallbackId, updatedAt: new Date() })
      .where(eq(transactions.categoryId, id));

    const deleted = await repoDeleteCategory(tx, id);
    if (!deleted) {
      throw new Error(`Failed to delete category ${id}`);
    }
  });

  return true;
}
