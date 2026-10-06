import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { hexColors } from "./hex-colors";
import { pockets } from "./pockets";

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    note: text("note"),
    targetAmountMinorUnits: integer("target_amount_minor_units").notNull(),
    currencyCode: text("currency_code").notNull().default("PHP"),
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    pocketId: text("pocket_id").references(() => pockets.id, {
      onDelete: "set null",
    }),
    targetDate: integer("target_date", { mode: "timestamp_ms" }),
    iconKey: text("icon_key"),
    hexColorsId: text("hex_colors_id").references(() => hexColors.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["in_progress", "completed", "paused"],
    })
      .notNull()
      .default("in_progress"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("goals_account_id_index").on(table.accountId),
    index("goals_status_sort_index").on(table.status, table.sortOrder),
    check("goals_target_amount_check", sql`${table.targetAmountMinorUnits} > 0`),
    check(
      "goals_status_check",
      sql`${table.status} in ('in_progress', 'completed', 'paused')`,
    ),
  ],
);

export const goalAccounts = sqliteTable(
  "goal_accounts",
  {
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.goalId, table.accountId] }),
    index("goal_accounts_goal_id_index").on(table.goalId),
    index("goal_accounts_account_id_index").on(table.accountId),
  ],
);

export const goalPockets = sqliteTable(
  "goal_pockets",
  {
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    pocketId: text("pocket_id")
      .notNull()
      .references(() => pockets.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.goalId, table.pocketId] }),
    index("goal_pockets_goal_id_index").on(table.goalId),
    index("goal_pockets_pocket_id_index").on(table.pocketId),
  ],
);

export type GoalTable = typeof goals;
export type GoalRecord = typeof goals.$inferSelect;
export type NewGoalRecord = typeof goals.$inferInsert;

export type GoalAccountTable = typeof goalAccounts;
export type GoalAccountRecord = typeof goalAccounts.$inferSelect;
export type NewGoalAccountRecord = typeof goalAccounts.$inferInsert;

export type GoalPocketTable = typeof goalPockets;
export type GoalPocketRecord = typeof goalPockets.$inferSelect;
export type NewGoalPocketRecord = typeof goalPockets.$inferInsert;
