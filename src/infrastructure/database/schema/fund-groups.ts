import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { pockets } from "./pockets";

export const fundGroups = sqliteTable(
  "fund_groups",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check("fund_groups_sort_order_check", sql`${table.sortOrder} >= 0`),
    uniqueIndex("fund_groups_name_normalized_unique").on(table.nameNormalized),
    index("fund_groups_sort_index").on(table.sortOrder, table.name),
  ],
);

export const fundGroupAccounts = sqliteTable(
  "fund_group_accounts",
  {
    fundGroupId: text("fund_group_id")
      .notNull()
      .references(() => fundGroups.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.fundGroupId, table.accountId] }),
    uniqueIndex("fund_group_accounts_account_unique").on(table.accountId),
    index("fund_group_accounts_group_sort_index").on(
      table.fundGroupId,
      table.sortOrder,
    ),
  ],
);

export const fundGroupPockets = sqliteTable(
  "fund_group_pockets",
  {
    fundGroupId: text("fund_group_id")
      .notNull()
      .references(() => fundGroups.id, { onDelete: "cascade" }),
    pocketId: text("pocket_id")
      .notNull()
      .references(() => pockets.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.fundGroupId, table.pocketId] }),
    uniqueIndex("fund_group_pockets_pocket_unique").on(table.pocketId),
    index("fund_group_pockets_group_sort_index").on(
      table.fundGroupId,
      table.sortOrder,
    ),
  ],
);

export type FundGroupTable = typeof fundGroups;
export type FundGroupAccountTable = typeof fundGroupAccounts;
export type FundGroupPocketTable = typeof fundGroupPockets;
