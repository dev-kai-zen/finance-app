import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { categories } from "./categories";

export const categoryBudgets = sqliteTable(
  "category_budgets",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    isEnabled: integer("is_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    amountCents: integer("amount_cents").notNull().default(0),
    frequency: text("frequency", {
      enum: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "custom_monthly",
        "quarterly",
        "yearly",
      ],
    })
      .notNull()
      .default("monthly"),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    allowRollover: integer("allow_rollover", { mode: "boolean" })
      .notNull()
      .default(false),
    rolloverMode: text("rollover_mode", {
      enum: ["positive_only", "full"],
    })
      .notNull()
      .default("positive_only"),
    notifyOnExceeded: integer("notify_on_exceeded", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("category_budgets_category_id_unique").on(table.categoryId),
    index("category_budgets_enabled_index").on(table.isEnabled),
    check("category_budgets_amount_check", sql`${table.amountCents} >= 0`),
    check(
      "category_budgets_frequency_check",
      sql`${table.frequency} in ('daily', 'weekly', 'biweekly', 'monthly', 'custom_monthly', 'quarterly', 'yearly')`,
    ),
    check(
      "category_budgets_rollover_mode_check",
      sql`${table.rolloverMode} in ('positive_only', 'full')`,
    ),
  ],
);

export const budgetMonthlyTargets = sqliteTable(
  "budget_monthly_targets",
  {
    id: text("id").primaryKey(),
    budgetId: text("budget_id")
      .notNull()
      .references(() => categoryBudgets.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1 - 12
    amountCents: integer("amount_cents").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("budget_monthly_targets_budget_year_month_unique").on(
      table.budgetId,
      table.year,
      table.month,
    ),
    index("budget_monthly_targets_budget_id_index").on(table.budgetId),
    check(
      "budget_monthly_targets_month_check",
      sql`${table.month} >= 1 and ${table.month} <= 12`,
    ),
    check("budget_monthly_targets_amount_check", sql`${table.amountCents} >= 0`),
  ],
);
