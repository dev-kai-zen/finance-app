import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const importBatches = sqliteTable("import_batches", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  kind: text("kind").notNull(),
  source: text("source").notNull(),
  importedCount: integer("imported_count").notNull(),
  skippedCount: integer("skipped_count").notNull(),
  summaryJson: text("summary_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// No financial-record foreign keys: provenance survives deletion and prevents reimport.
export const importRecords = sqliteTable("import_records", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  sourceKey: text("source_key").notNull(),
  recordIdsJson: text("record_ids_json").notNull(),
  rowNumber: integer("row_number").notNull(),
}, (table) => [
  uniqueIndex("import_records_source_key_unique").on(table.sourceKey),
  index("import_records_batch_index").on(table.batchId),
]);
