import { notifyCategoryChanges } from "./category-changes.service";
import { db, type AppDatabase } from "@/infrastructure/database/client";
import { invalidateChatKeywordsCache } from "@/modules/chat-with-kai";
import { reassignScheduledTransactionCategoryReferences } from "@/modules/scheduled-transactions";
import { reassignTransactionCategoryReferences } from "@/modules/transactions";
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
const REMOVED_PRESET_IDS = ["cat_exp_groceries"] as const;

export async function loadCategoryPresets(client: AppDatabase = db): Promise<void> {
  await client.transaction((tx) => {
    const now = new Date();
    for (const [sortOrder, category] of DEFAULT_SEED_CATEGORIES.entries()) {
      insertCategoryPreset(tx, category, sortOrder, now);
    }
  });
  invalidateChatKeywordsCache();
  if (client === db) notifyCategoryChanges();
}

export async function deleteCategoryPresets(
  client: AppDatabase = db,
): Promise<void> {
  const deletablePresets = DEFAULT_SEED_CATEGORIES.filter(
    (category) => !isProtectedCategoryId(category.id),
  );
  const presetIds = [
    ...deletablePresets.map((category) => category.id),
    ...REMOVED_PRESET_IDS,
  ];
  const presetGroupIds = deletablePresets
    .filter((category) => !category.parentId)
    .map((category) => category.id)
    .concat([...REMOVED_PRESET_IDS]);

  client.transaction((tx) => {
    detachCustomChildrenFromPresetGroups(tx, presetGroupIds, presetIds);

    // Delete children first so the self-referencing parent foreign key remains valid.
    for (const category of deletablePresets.filter((item) => item.parentId)) {
      const fallbackId = category.type === "income" ? INCOME_FALLBACK_ID : EXPENSE_FALLBACK_ID;
      reassignTransactionCategoryReferences(category.id, fallbackId, tx);
      reassignScheduledTransactionCategoryReferences(category.id, fallbackId, tx);
      deleteCategoryPresetData(tx, category.id);
    }

    for (const category of deletablePresets.filter((item) => !item.parentId)) {
      const fallbackId = category.type === "income" ? INCOME_FALLBACK_ID : EXPENSE_FALLBACK_ID;
      reassignTransactionCategoryReferences(category.id, fallbackId, tx);
      reassignScheduledTransactionCategoryReferences(category.id, fallbackId, tx);
      deleteCategoryPresetData(tx, category.id);
    }

    // Remove the old standalone Groceries preset from databases created by
    // the previous preset set.
    for (const id of REMOVED_PRESET_IDS) {
      reassignTransactionCategoryReferences(id, EXPENSE_FALLBACK_ID, tx);
      reassignScheduledTransactionCategoryReferences(id, EXPENSE_FALLBACK_ID, tx);
      deleteCategoryPresetData(tx, id);
    }
  });
  invalidateChatKeywordsCache();
  if (client === db) notifyCategoryChanges();
}
