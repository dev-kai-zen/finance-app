import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { DEFAULT_BASE_CURRENCY } from "@/utils/currency";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { pockets } from "./pockets";

export const transactionPresets = sqliteTable(
  "transaction_presets",
  {
    id: text("id").primaryKey(),
    transactionName: text("transaction_name").notNull(),
    type: text("type", {
      enum: ["income", "expense", "transfer"],
    }).notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    pocketId: text("pocket_id").references(() => pockets.id, {
      onDelete: "set null",
    }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    toAccountId: text("to_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    toPocketId: text("to_pocket_id").references(() => pockets.id, {
      onDelete: "set null",
    }),
    amountMinorUnits: integer("amount_minor_units"),
    currencyCode: text("currency_code").notNull().default(DEFAULT_BASE_CURRENCY),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    usageCount: integer("usage_count").notNull().default(0),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    check(
      "transaction_presets_type_check",
      sql`${table.type} in ('income', 'expense', 'transfer')`,
    ),
    check(
      "transaction_presets_transaction_name_check",
      sql`length(trim(${table.transactionName})) > 0`,
    ),
    check(
      "transaction_presets_amount_check",
      sql`${table.amountMinorUnits} is null or ${table.amountMinorUnits} != 0`,
    ),
    check(
      "transaction_presets_transfer_amount_check",
      sql`${table.type} != 'transfer' or ${table.amountMinorUnits} is null or ${table.amountMinorUnits} > 0`,
    ),
    check(
      "transaction_presets_usage_count_check",
      sql`${table.usageCount} >= 0`,
    ),
    index("transaction_presets_active_sort_index").on(
      table.deletedAt,
      table.sortOrder,
    ),
    index("transaction_presets_account_id_index").on(table.accountId),
    index("transaction_presets_to_account_id_index").on(table.toAccountId),
    index("transaction_presets_category_id_index").on(table.categoryId),
  ],
);
