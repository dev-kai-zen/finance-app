import { asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactionPresets } from "@/infrastructure/database/schema";
import type {
  ListPresetsOptions,
  NewTransactionPreset,
  TransactionPreset,
} from "../types/transaction-preset.types";

export function newTransactionPresetId(context: DbContext = db): string {
  return context.get<{ id: string }>(
    sql`SELECT lower(hex(randomblob(16))) AS id`,
  )!.id;
}

export function listActiveTransactionPresets(
  optionsOrContext?: ListPresetsOptions | DbContext,
  maybeContext?: DbContext,
): TransactionPreset[] {
  const isOptions = Boolean(optionsOrContext && "sortBy" in optionsOrContext);
  const options: ListPresetsOptions = isOptions
    ? (optionsOrContext as ListPresetsOptions)
    : {};
  const context: DbContext = isOptions
    ? (maybeContext ?? db)
    : ((optionsOrContext as DbContext | undefined) ?? db);

  const query = context
    .select()
    .from(transactionPresets)
    .where(isNull(transactionPresets.deletedAt));

  if (options.sortBy === "last_used_at") {
    return query
      .orderBy(
        sql`CASE WHEN ${transactionPresets.lastUsedAt} IS NULL THEN 1 ELSE 0 END ASC`,
        desc(transactionPresets.lastUsedAt),
        asc(transactionPresets.sortOrder),
        asc(transactionPresets.transactionName),
      )
      .all();
  }

  return query
    .orderBy(
      asc(transactionPresets.sortOrder),
      asc(transactionPresets.transactionName),
    )
    .all();
}

export function listArchivedTransactionPresets(
  optionsOrContext?: ListPresetsOptions | DbContext,
  maybeContext?: DbContext,
): TransactionPreset[] {
  const isOptions = Boolean(optionsOrContext && "sortBy" in optionsOrContext);
  const options: ListPresetsOptions = isOptions
    ? (optionsOrContext as ListPresetsOptions)
    : {};
  const context: DbContext = isOptions
    ? (maybeContext ?? db)
    : ((optionsOrContext as DbContext | undefined) ?? db);

  const query = context
    .select()
    .from(transactionPresets)
    .where(isNotNull(transactionPresets.deletedAt));

  if (options.sortBy === "last_used_at") {
    return query
      .orderBy(
        sql`CASE WHEN ${transactionPresets.lastUsedAt} IS NULL THEN 1 ELSE 0 END ASC`,
        desc(transactionPresets.lastUsedAt),
        desc(transactionPresets.deletedAt),
        asc(transactionPresets.transactionName),
      )
      .all();
  }

  return query
    .orderBy(
      desc(transactionPresets.deletedAt),
      asc(transactionPresets.sortOrder),
      asc(transactionPresets.transactionName),
    )
    .all();
}

export function findTransactionPresetById(
  id: string,
  context: DbContext = db,
): TransactionPreset | null {
  return (
    context
      .select()
      .from(transactionPresets)
      .where(eq(transactionPresets.id, id))
      .get() ?? null
  );
}

export function insertTransactionPreset(
  value: NewTransactionPreset,
  context: DbContext = db,
): TransactionPreset {
  context.insert(transactionPresets).values(value).run();
  return findTransactionPresetById(value.id, context)!;
}

export function updateTransactionPresetRecord(
  id: string,
  value: Partial<
    Pick<
      NewTransactionPreset,
      | "transactionName"
      | "type"
      | "accountId"
      | "pocketId"
      | "categoryId"
      | "toAccountId"
      | "toPocketId"
      | "amountCents"
      | "note"
      | "sortOrder"
      | "usageCount"
      | "lastUsedAt"
      | "updatedAt"
      | "deletedAt"
    >
  >,
  context: DbContext = db,
): void {
  context
    .update(transactionPresets)
    .set(value)
    .where(eq(transactionPresets.id, id))
    .run();
}

export function softDeleteTransactionPreset(
  id: string,
  context: DbContext = db,
  deletedAt = new Date(),
): void {
  updateTransactionPresetRecord(
    id,
    { deletedAt, updatedAt: deletedAt },
    context,
  );
}

export function restoreTransactionPresetRecord(
  id: string,
  context: DbContext = db,
  updatedAt = new Date(),
): void {
  updateTransactionPresetRecord(
    id,
    { deletedAt: null, updatedAt },
    context,
  );
}

export function deleteTransactionPresetRecord(
  id: string,
  context: DbContext = db,
): void {
  context.delete(transactionPresets).where(eq(transactionPresets.id, id)).run();
}

export function deleteAllTransactionPresetRecords(
  context: DbContext = db,
): void {
  context.delete(transactionPresets).run();
}

export function reassignTransactionPresetCategoryRecords(
  fromCategoryId: string,
  toCategoryId: string,
  context: DbContext = db,
): void {
  context
    .update(transactionPresets)
    .set({ categoryId: toCategoryId, updatedAt: new Date() })
    .where(eq(transactionPresets.categoryId, fromCategoryId))
    .run();
}
