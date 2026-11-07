import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const importBatches = sqliteTable(
  "import_batches",
  {
    id: text("id").primaryKey(),
    fileName: text("file_name").notNull(),
    importType: text("import_type").notNull(),
    sourceName: text("source_name").notNull(),
    importedCount: integer("imported_count").notNull(),
    leftOutCount: integer("left_out_count").notNull(),
    summary: text("summary").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("import_batches_created_at_idx").on(table.createdAt),
  ],
);

export const importedSourceIdentities = sqliteTable(
  "imported_source_identities",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    sourceIdentity: text("source_identity").notNull(),
    rowNumber: integer("row_number").notNull(),
    createdRecordIds: text("created_record_ids").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("imported_source_identities_source_identity_unique").on(
      table.sourceIdentity,
    ),
    index("imported_source_identities_batch_id_idx").on(table.batchId),
  ],
);

