import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const currencies = sqliteTable(
  "currencies",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    minorUnitExponent: integer("minor_unit_exponent").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "currencies_minor_unit_exponent_check",
      sql`${table.minorUnitExponent} >= 0 and ${table.minorUnitExponent} <= 18`,
    ),
    index("currencies_active_sort_index").on(table.isActive, table.sortOrder, table.code),
  ],
);

export type CurrencyTable = typeof currencies;
export type CurrencyRecord = typeof currencies.$inferSelect;
export type NewCurrencyRecord = typeof currencies.$inferInsert;
