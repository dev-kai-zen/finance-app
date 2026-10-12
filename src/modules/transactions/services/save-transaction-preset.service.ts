import { db, type DbContext } from "@/infrastructure/database/client";
import { requireAccount, requirePocketForAccount } from "@/modules/accounts";
import { requireCategory } from "@/modules/categories";
import {
  findTransactionPresetById,
  insertTransactionPreset,
  listActiveTransactionPresets,
  newTransactionPresetId,
  updateTransactionPresetRecord,
} from "../repositories/transaction-presets.repository";
import { transactionPresetInputSchema } from "../schemas/transaction-preset.schema";
import type {
  TransactionPreset,
  TransactionPresetInput,
} from "../types/transaction-preset.types";

export function normalizeQuickPresetTransactionName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function saveTransactionPreset(
  input: TransactionPresetInput,
  id?: string,
): TransactionPreset {
  return db.transaction((tx) => saveTransactionPresetInContext(input, id, tx));
}

export function saveTransactionPresetInContext(
  input: TransactionPresetInput,
  id: string | undefined,
  context: DbContext,
): TransactionPreset {
  const value = transactionPresetInputSchema.parse(input);
  const existing = id ? findTransactionPresetById(id, context) : null;
  if (id && (!existing || existing.deletedAt)) {
    throw new Error("This Quick Preset no longer exists.");
  }

  const normalizedName = normalizeQuickPresetTransactionName(value.transactionName);
  const duplicate = listActiveTransactionPresets(context).find(
    (preset) =>
      preset.id !== existing?.id &&
      normalizeQuickPresetTransactionName(preset.transactionName) ===
      normalizedName,
  );
  if (duplicate) {
    throw new Error(
      `A Quick Preset for "${duplicate.transactionName}" already exists.`,
    );
  }

  const account = requireAccount(value.accountId, context);
  if (account.isArchived) {
    throw new Error("Choose an active account for this Quick Preset.");
  }
  if (value.pocketId) {
    requirePocketForAccount(value.pocketId, account.id, context);
  }

  let categoryId: string | null = null;
  let toAccountId: string | null = null;
  let toPocketId: string | null = null;

  if (value.type === "transfer") {
    const destination = requireAccount(value.toAccountId!, context);
    if (destination.isArchived) {
      throw new Error("Choose an active destination account for this Quick Preset.");
    }
    if (account.currencyCode !== destination.currencyCode) {
      throw new Error(
        "Cross-currency transfers are not supported yet. Choose accounts with the same currency.",
      );
    }
    toAccountId = destination.id;
    toPocketId = value.toPocketId ?? null;
    if (toPocketId) {
      requirePocketForAccount(toPocketId, destination.id, context);
    }
  } else {
    const category = requireCategory(value.categoryId!, context);
    if (category.type !== value.type) {
      throw new Error("The category does not match the transaction type.");
    }
    categoryId = category.id;
  }

  const now = new Date();
  const record = {
    transactionName: value.transactionName.trim(),
    type: value.type,
    accountId: account.id,
    pocketId: value.pocketId ?? null,
    categoryId,
    toAccountId,
    toPocketId,
    amountMinorUnits: value.amountMinorUnits ?? null,
    currencyCode: account.currencyCode,
    note: value.note?.trim() || null,
    updatedAt: now,
  };

  if (existing) {
    updateTransactionPresetRecord(existing.id, record, context);
    return findTransactionPresetById(existing.id, context)!;
  }

  const sortOrder =
    Math.max(
      -1,
      ...listActiveTransactionPresets(context).map((preset) => preset.sortOrder),
    ) + 1;
  return insertTransactionPreset(
    {
      id: newTransactionPresetId(context),
      ...record,
      sortOrder,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: now,
      deletedAt: null,
    },
    context,
  );
}
