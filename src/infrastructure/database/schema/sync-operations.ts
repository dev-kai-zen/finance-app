import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const syncOperations = sqliteTable(
  "sync_operations",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    operation: text("operation", { enum: ["upload", "delete"] }).notNull(),
    payload: text("payload").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "sync_operations_operation_check",
      sql`${table.operation} in ('upload', 'delete')`,
    ),
    index("sync_operations_due_index").on(
      table.entityType,
      table.nextAttemptAt,
      table.createdAt,
    ),
    index("sync_operations_entity_index").on(
      table.entityType,
      table.entityId,
    ),
  ],
);
