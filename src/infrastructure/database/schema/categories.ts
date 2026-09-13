import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => categories.id),
    color: text("color"),
    icon: text("icon"),
    isSystem: integer("is_system", { mode: "boolean" })
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("categories_type_index").on(table.type),
    index("categories_parent_id_index").on(table.parentId),
    index("categories_sort_order_index").on(table.sortOrder),
  ],
);
