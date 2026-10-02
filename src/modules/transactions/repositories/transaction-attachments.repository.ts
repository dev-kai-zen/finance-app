import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import { transactionAttachments } from "@/infrastructure/database/schema";
import type {
  TransactionAttachment,
  TransactionAttachmentSyncStatus,
} from "../types/transaction.types";

export type NewTransactionAttachmentRecord = Omit<
  TransactionAttachment,
  "driveFileId" | "syncStatus" | "lastSyncError" | "deletedAt"
>;

export function listTransactionAttachmentsByOwner(
  transactionId: string,
  options: { limit: number; offset: number },
  context: DbContext = db,
): TransactionAttachment[] {
  return context
    .select()
    .from(transactionAttachments)
    .where(
      and(
        eq(transactionAttachments.transactionId, transactionId),
        isNull(transactionAttachments.deletedAt),
      ),
    )
    .orderBy(
      desc(transactionAttachments.createdAt),
      desc(transactionAttachments.id),
    )
    .limit(options.limit)
    .offset(options.offset)
    .all()
    .map(mapAttachment);
}

export function countTransactionAttachmentsByOwner(
  transactionId: string,
  context: DbContext = db,
): number {
  const row = context
    .select({ count: sql<number>`count(*)` })
    .from(transactionAttachments)
    .where(
      and(
        eq(transactionAttachments.transactionId, transactionId),
        isNull(transactionAttachments.deletedAt),
      ),
    )
    .get();
  return Number(row?.count ?? 0);
}

export function findTransactionAttachmentById(
  id: string,
  context: DbContext = db,
): TransactionAttachment | null {
  const row = context
    .select()
    .from(transactionAttachments)
    .where(eq(transactionAttachments.id, id))
    .get();
  return row ? mapAttachment(row) : null;
}

export function listTransactionAttachmentsByOwnersIncludingDeleted(
  transactionIds: readonly string[],
  context: DbContext = db,
): TransactionAttachment[] {
  if (transactionIds.length === 0) return [];
  return context
    .select()
    .from(transactionAttachments)
    .where(inArray(transactionAttachments.transactionId, [...transactionIds]))
    .all()
    .map(mapAttachment);
}

export function insertTransactionAttachment(
  attachment: NewTransactionAttachmentRecord,
  context: DbContext = db,
): TransactionAttachment {
  const record = {
    ...attachment,
    driveFileId: null,
    syncStatus: "pending" as const,
    lastSyncError: null,
    deletedAt: null,
  };
  context.insert(transactionAttachments).values(record).run();
  return record;
}

export function updateTransactionAttachmentSync(
  id: string,
  values: {
    syncStatus: TransactionAttachmentSyncStatus;
    driveFileId?: string | null;
    lastSyncError?: string | null;
  },
  context: DbContext = db,
): void {
  context
    .update(transactionAttachments)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(transactionAttachments.id, id))
    .run();
}

export function softDeleteTransactionAttachment(
  id: string,
  deletedAt = new Date(),
  context: DbContext = db,
): void {
  context
    .update(transactionAttachments)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(transactionAttachments.id, id))
    .run();
}

export function deleteTransactionAttachmentRecord(
  id: string,
  context: DbContext = db,
): void {
  context
    .delete(transactionAttachments)
    .where(eq(transactionAttachments.id, id))
    .run();
}

function mapAttachment(
  row: typeof transactionAttachments.$inferSelect,
): TransactionAttachment {
  return {
    ...row,
    syncStatus: row.syncStatus as TransactionAttachmentSyncStatus,
  };
}
