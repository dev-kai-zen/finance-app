import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { categories } from "./categories";
import { accounts } from "./accounts";

export const merchants = sqliteTable(
  "merchants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    defaultCategoryId: text("default_category_id").references(
      () => categories.id,
      { onDelete: "set null" },
    ),
    defaultAccountId: text("default_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("merchants_name_lower_unique").on(sql`lower(${table.name})`),
    index("merchants_default_category_id_index").on(table.defaultCategoryId),
    index("merchants_default_account_id_index").on(table.defaultAccountId),
  ],
);

export const merchantKeywords = sqliteTable(
  "merchant_keywords",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("merchant_keywords_keyword_lower_unique").on(
      sql`lower(${table.keyword})`,
    ),
    index("merchant_keywords_merchant_id_index").on(table.merchantId),
  ],
);

export type MerchantTable = typeof merchants;
export type MerchantKeywordTable = typeof merchantKeywords;
