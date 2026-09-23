import type { DbContext } from "@/infrastructure/database/client";
import { DEFAULT_SEED_CATEGORIES } from "@/modules/categories/constants/categories.constants";
import {
  deleteNonSystemCategoryRecords,
  insertCategoryPreset,
} from "@/modules/categories/repositories/categories.repository";

export type CategorySetup = "recommended" | "essentials";

const ESSENTIAL_CATEGORY_IDS = new Set([
  "cat_exp_food",
  "cat_exp_transport",
  "cat_exp_utilities",
  "cat_exp_others",
  "cat_inc_salary",
  "cat_inc_others",
  "cat_sub_food_groceries",
  "cat_sub_salary_base",
]);

export async function prepareWorkspaceCategories(
  setup: CategorySetup,
  context: DbContext,
  now = new Date(),
): Promise<void> {
  const categories =
    setup === "recommended"
      ? DEFAULT_SEED_CATEGORIES
      : DEFAULT_SEED_CATEGORIES.filter(({ id }) =>
          ESSENTIAL_CATEGORY_IDS.has(id),
        );

  for (const [sortOrder, category] of categories.entries()) {
    await insertCategoryPreset(context, category, sortOrder, now);
  }
}

export function clearCustomWorkspaceCategories(context: DbContext): void {
  deleteNonSystemCategoryRecords(context);
}
