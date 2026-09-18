import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { accounts } from "./accounts";
import { pockets } from "./pockets";

export const pocketMovements = sqliteTable(
  "pocket_movements",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    fromPocketId: text("from_pocket_id").references(() => pockets.id, {
      onDelete: "restrict",
    }),
    toPocketId: text("to_pocket_id").references(() => pockets.id, {
      onDelete: "restrict",
    }),
    amountMinorUnits: integer("amount_minor_units").notNull(),
    note: text("note"),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("pocket_movements_account_occurred_at_index").on(
      table.accountId,
      table.occurredAt,
    ),
    index("pocket_movements_from_pocket_index").on(table.fromPocketId),
    index("pocket_movements_to_pocket_index").on(table.toPocketId),
    check("pocket_movements_positive_amount_check", sql`${table.amountMinorUnits} > 0`),
    check(
      "pocket_movements_endpoints_check",
      sql`(${table.fromPocketId} IS NOT NULL OR ${table.toPocketId} IS NOT NULL)
        AND (${table.fromPocketId} IS NULL OR ${table.toPocketId} IS NULL OR ${table.fromPocketId} <> ${table.toPocketId})`,
    ),
  ],
);

export type PocketMovementTable = typeof pocketMovements;
