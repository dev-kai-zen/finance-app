import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { categories } from "./categories";

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    categoryId: text("category_id").references(() => categories.id),
    transactionGroupId: text("transaction_group_id"),
    type: text("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    name: text("name"),
    note: text("note"),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("transactions_account_occurred_at_index").on(
      table.accountId,
      table.occurredAt,
    ),
    index("transactions_category_occurred_at_index").on(
      table.categoryId,
      table.occurredAt,
    ),
    index("transactions_transaction_group_id_index").on(
      table.transactionGroupId,
    ),
  ],
);
