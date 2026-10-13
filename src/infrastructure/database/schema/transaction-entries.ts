import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { categories } from "./categories";
import { transactions } from "./transactions";

export const transactionEntries = sqliteTable(
  "transaction_entries",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    amountMinorUnits: integer("amount_minor_units").notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("transaction_entries_transaction_id_index").on(table.transactionId),
    index("transaction_entries_category_id_index").on(table.categoryId),
  ],
);

export type TransactionEntryTable = typeof transactionEntries;
