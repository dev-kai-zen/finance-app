import { eq } from "drizzle-orm";
import { db, type AppDatabase } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema/transactions";
import {
  deleteCategory as repoDeleteCategory,
  getCategoryById,
} from "../repositories/categories.repository";

export async function deleteCategory(
  id: string,
  client: AppDatabase = db,
): Promise<boolean> {
  const existing = await getCategoryById(client, id);
  if (!existing) {
    throw new Error("Category not found.");
  }

  if (existing.isSystem) {
    throw new Error("System default categories are protected and cannot be deleted.");
  }

  const fallbackId = existing.type === "income" ? "cat_inc_others" : "cat_exp_others";

  await client.transaction(async (tx) => {
    // Reassign any transactions linked to this category to the fallback "Others" category
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
