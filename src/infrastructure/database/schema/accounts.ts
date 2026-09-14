import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { accountTypes } from "./account-types";

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountTypeId: text("account_type_id")
      .notNull()
      .references(() => accountTypes.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    note: text("note"),
    currencyCode: text("currency_code").notNull(),
    openingBalanceMinorUnits: integer("opening_balance_minor_units")
      .notNull()
      .default(0),
    openingBalanceAt: integer("opening_balance_at", {
      mode: "timestamp_ms",
    }).notNull(),
    isArchived: integer("is_archived", { mode: "boolean" })
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("accounts_account_type_id_index").on(table.accountTypeId),
    index("accounts_archived_sort_index").on(table.isArchived, table.sortOrder),
  ],
);

export type AccountTable = typeof accounts;
