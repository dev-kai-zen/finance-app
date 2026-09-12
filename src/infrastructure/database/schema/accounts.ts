import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    currency: text("currency").notNull(),
    openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("accounts_name_index").on(table.name)],
);
