import { db, type DbContext } from "@/infrastructure/database/client";
import { reorderCategoriesInDb } from "../repositories/categories.repository";

export async function reorderCategories(
  orderedIds: string[],
  client: DbContext = db,
): Promise<void> {
  if (!orderedIds || orderedIds.length === 0) {
    return;
  }
  await reorderCategoriesInDb(client, orderedIds);
}
