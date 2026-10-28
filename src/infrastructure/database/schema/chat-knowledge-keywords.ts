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

export const categoryKeywords = sqliteTable(
  "category_keywords",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    language: text("language").default("any"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("category_keywords_keyword_unique").on(sql`lower(${table.keyword})`),
    index("category_keywords_category_id_index").on(table.categoryId),
  ],
);

export const accountKeywords = sqliteTable(
  "account_keywords",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    language: text("language").default("any"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("account_keywords_keyword_unique").on(sql`lower(${table.keyword})`),
    index("account_keywords_account_id_index").on(table.accountId),
  ],
);

export const actionKeywords = sqliteTable(
  "action_keywords",
  {
    id: text("id").primaryKey(),
    actionType: text("action_type").notNull(),
    keyword: text("keyword").notNull(),
    language: text("language").default("any"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("action_keywords_keyword_unique").on(sql`lower(${table.keyword})`),
    index("action_keywords_action_type_index").on(table.actionType),
  ],
);

export type CategoryKeywordTable = typeof categoryKeywords;
export type AccountKeywordTable = typeof accountKeywords;
export type ActionKeywordTable = typeof actionKeywords;

