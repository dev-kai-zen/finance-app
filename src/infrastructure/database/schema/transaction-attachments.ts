import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { transactions } from "./transactions";

export const transactionAttachments = sqliteTable(
  "transaction_attachments",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    driveFileId: text("drive_file_id"),
    syncStatus: text("sync_status", {
      enum: ["pending", "syncing", "synced", "failed"],
    })
      .notNull()
      .default("pending"),
    lastSyncError: text("last_sync_error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    check(
      "transaction_attachments_sync_status_check",
      sql`${table.syncStatus} in ('pending', 'syncing', 'synced', 'failed')`,
    ),
    check(
      "transaction_attachments_size_check",
      sql`${table.sizeBytes} >= 0`,
    ),
    index("transaction_attachments_transaction_index").on(
      table.transactionId,
      table.deletedAt,
    ),
    index("transaction_attachments_drive_file_index").on(table.driveFileId),
  ],
);
