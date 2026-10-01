import { asc, eq, isNull, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactionPresets } from "@/infrastructure/database/schema";
import type {
  NewTransactionPreset,
  TransactionPreset,
} from "../types/transaction-preset.types";

export function newTransactionPresetId(context: DbContext = db): string {
  return context.get<{ id: string }>(
    sql`SELECT lower(hex(randomblob(16))) AS id`,
  )!.id;
}

export function listActiveTransactionPresets(
  context: DbContext = db,
): TransactionPreset[] {
  return context
    .select()
    .from(transactionPresets)
    .where(isNull(transactionPresets.deletedAt))
    .orderBy(
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
