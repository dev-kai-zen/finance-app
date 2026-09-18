import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";

export const pockets = sqliteTable(
  "pockets",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmountMinorUnits: integer("target_amount_minor_units"),
    isArchived: integer("is_archived", { mode: "boolean" })
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("pockets_account_archived_sort_index").on(
      table.accountId,
      table.isArchived,
      table.sortOrder,
    ),
    uniqueIndex("pockets_account_name_unique").on(
      table.accountId,
      table.name,
    ),
  ],
);

export type PocketTable = typeof pockets;
