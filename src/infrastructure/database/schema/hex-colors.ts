import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const hexColors = sqliteTable("hex_colors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hex: text("hex").notNull(),
  isSystem: integer("is_system", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type HexColorTable = typeof hexColors;
