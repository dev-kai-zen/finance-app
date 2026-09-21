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
    iconKey: text("icon_key"),
    currencyCode: text("currency_code").notNull(),
    openingBalanceMinorUnits: integer("opening_balance_minor_units")
      .notNull()
      .default(0),
    openingBalanceAt: integer("opening_balance_at", {
      mode: "timestamp_ms",
    }).notNull(),
    startingBalanceLocked: integer("starting_balance_locked", { mode: "boolean" })
      .notNull()
      .default(false),
    hideFromSelection: integer("hide_from_selection", { mode: "boolean" })
      .notNull()
      .default(false),
    hideFromReports: integer("hide_from_reports", { mode: "boolean" })
      .notNull()
      .default(false),
    pocketEnabled: integer("pocket_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    maintainingBalanceMinorUnits: integer("maintaining_balance_minor_units"),
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
