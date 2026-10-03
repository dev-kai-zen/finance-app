import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { transactions } from "./transactions";
import { labels } from "./labels";

export const transactionLabels = sqliteTable(
  "transaction_labels",
  {
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.transactionId, table.labelId] }),
    index("transaction_labels_label_id_index").on(table.labelId, table.transactionId),
    index("transaction_labels_transaction_id_index").on(table.transactionId),
  ],
);

export type TransactionLabelTable = typeof transactionLabels;
