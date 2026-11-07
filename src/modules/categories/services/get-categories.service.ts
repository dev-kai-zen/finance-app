import { db, type DbContext } from "@/infrastructure/database/client";
import { listCategories } from "../repositories/categories.repository";
import type { Category } from "../types/category.types";

export async function getCategories(
  context: DbContext = db,
  options?: { flat?: boolean },
): Promise<Category[]> {
  return listCategories(context, options);
}

