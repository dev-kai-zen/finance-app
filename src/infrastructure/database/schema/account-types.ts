import { sql } from "drizzle-orm";

import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const accountTypes = sqliteTable(
  "account_types",

  {
    id: text("id").primaryKey(),

    name: text("name").notNull(),

    accountGroup: text("account_group").notNull(),

    iconKey: text("icon_key"),

    color: text("color"),

    isSystem: integer("is_system", { mode: "boolean" })
      .notNull()
      .default(false),

    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),

    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },

  (table) => [
    check(
      "account_types_account_group_check",

      sql`${table.accountGroup} IN ('asset', 'liability')`,
    ),

    check("account_types_sort_order_check", sql`${table.sortOrder} >= 0`),

    index("account_types_group_sort_index").on(
      table.accountGroup,

      table.sortOrder,
    ),

    uniqueIndex("account_types_group_name_unique").on(
      table.accountGroup,

      table.name,
    ),
  ],
);

export type AccountTypeTable = typeof accountTypes;
