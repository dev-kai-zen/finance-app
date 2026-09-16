import { db, type AppDatabase } from "@/infrastructure/database/client";
import {
  DEFAULT_SEED_CATEGORIES,
  isProtectedCategoryId,
} from "../constants/categories.constants";
import {
  deleteCategoryPresetData,
  detachCustomChildrenFromPresetGroups,
  insertCategoryPreset,
} from "../repositories/categories.repository";

const EXPENSE_FALLBACK_ID = "cat_exp_others";
const INCOME_FALLBACK_ID = "cat_inc_others";

export async function loadCategoryPresets(client: AppDatabase = db): Promise<void> {
  await client.transaction(async (tx) => {
    const now = new Date();
    for (const [sortOrder, category] of DEFAULT_SEED_CATEGORIES.entries()) {
      await insertCategoryPreset(tx, category, sortOrder, now);
    }
  });
}

export async function deleteCategoryPresets(
  client: AppDatabase = db,
): Promise<void> {
  const deletablePresets = DEFAULT_SEED_CATEGORIES.filter(
    (category) => !isProtectedCategoryId(category.id),
  );
  const presetIds = deletablePresets.map((category) => category.id);
  const presetGroupIds = deletablePresets
    .filter((category) => !category.parentId)
    .map((category) => category.id);

  await client.transaction(async (tx) => {
    await detachCustomChildrenFromPresetGroups(tx, presetGroupIds, presetIds);

    // Delete children first so the self-referencing parent foreign key remains valid.
    for (const category of deletablePresets.filter((item) => item.parentId)) {
      await deleteCategoryPresetData(
        tx,
        category.id,
        category.type === "income" ? INCOME_FALLBACK_ID : EXPENSE_FALLBACK_ID,
      );
    }

    for (const category of deletablePresets.filter((item) => !item.parentId)) {
      await deleteCategoryPresetData(
        tx,
        category.id,
        category.type === "income" ? INCOME_FALLBACK_ID : EXPENSE_FALLBACK_ID,
      );
    }
  });
}
