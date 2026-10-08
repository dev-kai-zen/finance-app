import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { accounts } from "./accounts";
import { categories } from "./categories";
import { pockets } from "./pockets";
import { transactions } from "./transactions";

export const transactionSchedules = sqliteTable(
  "transaction_schedules",
  {
    id: text("id").primaryKey(),
    status: text("status", { enum: ["active", "paused", "completed"] })
      .notNull()
      .default("active"),
    transactionType: text("transaction_type", {
      enum: ["income", "expense", "transfer"],
    }).notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    pocketId: text("pocket_id").references(() => pockets.id, {
      onDelete: "set null",
    }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    toAccountId: text("to_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    toPocketId: text("to_pocket_id").references(() => pockets.id, {
      onDelete: "set null",
    }),
    amountMinorUnits: integer("amount_minor_units").notNull(),
    name: text("name"),
    note: text("note"),
    frequency: text("frequency", {
      enum: ["once", "daily", "weekly", "monthly", "yearly"],
    }).notNull(),
    intervalCount: integer("interval_count").notNull().default(1),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    timeZone: text("time_zone").notNull(),
    endMode: text("end_mode", {
      enum: ["never", "after_count", "on_date"],
    })
      .notNull()
      .default("never"),
    maxOccurrences: integer("max_occurrences"),
    endsOn: text("ends_on"),
    weekendPolicy: text("weekend_policy", {
      enum: ["exact", "next_weekday", "previous_weekday", "skip"],
    })
      .notNull()
      .default("exact"),
    autoPost: integer("auto_post", { mode: "boolean" })
      .notNull()
      .default(false),
    anchorOccurrenceNumber: integer("anchor_occurrence_number")
      .notNull()
      .default(1),
    nextOccurrenceNumber: integer("next_occurrence_number")
      .notNull()
      .default(1),
    nextNominalAt: integer("next_nominal_at", { mode: "timestamp_ms" }),
    nextEffectiveAt: integer("next_effective_at", { mode: "timestamp_ms" }),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "transaction_schedules_status_check",
      sql`${table.status} in ('active', 'paused', 'completed')`,
    ),
    check(
      "transaction_schedules_type_check",
      sql`${table.transactionType} in ('income', 'expense', 'transfer')`,
    ),
    check(
      "transaction_schedules_frequency_check",
      sql`${table.frequency} in ('once', 'daily', 'weekly', 'monthly', 'yearly')`,
    ),
    check(
      "transaction_schedules_end_mode_check",
      sql`${table.endMode} in ('never', 'after_count', 'on_date')`,
    ),
    check(
      "transaction_schedules_weekend_policy_check",
      sql`${table.weekendPolicy} in ('exact', 'next_weekday', 'previous_weekday', 'skip')`,
    ),
    check("transaction_schedules_amount_check", sql`${table.amountMinorUnits} > 0`),
    check(
      "transaction_schedules_interval_check",
      sql`${table.intervalCount} > 0`,
    ),
    check(
      "transaction_schedules_anchor_occurrence_number_check",
      sql`${table.anchorOccurrenceNumber} > 0`,
    ),
    check(
      "transaction_schedules_occurrence_number_check",
      sql`${table.nextOccurrenceNumber} >= ${table.anchorOccurrenceNumber}`,
    ),
    check(
      "transaction_schedules_end_values_check",
      sql`(${table.endMode} = 'never' and ${table.maxOccurrences} is null and ${table.endsOn} is null)
        or (${table.endMode} = 'after_count' and ${table.maxOccurrences} > 0 and ${table.endsOn} is null)
        or (${table.endMode} = 'on_date' and ${table.maxOccurrences} is null and ${table.endsOn} is not null)`,
    ),
    check(
      "transaction_schedules_template_check",
      sql`(${table.transactionType} = 'transfer' and ${table.categoryId} is null and ${table.toAccountId} is not null)
        or (${table.transactionType} in ('income', 'expense') and ${table.categoryId} is not null and ${table.toAccountId} is null and ${table.toPocketId} is null)`,
    ),
    index("transaction_schedules_due_index").on(
      table.status,
      table.nextEffectiveAt,
    ),
    index("transaction_schedules_account_index").on(table.accountId),
    index("transaction_schedules_to_account_index").on(table.toAccountId),
    index("transaction_schedules_category_index").on(table.categoryId),
  ],
);

export const transactionScheduleOccurrences = sqliteTable(
  "transaction_schedule_occurrences",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => transactionSchedules.id, { onDelete: "cascade" }),
    sequenceNumber: integer("sequence_number").notNull(),
    nominalDueAt: integer("nominal_due_at", {
      mode: "timestamp_ms",
    }).notNull(),
    effectiveDueAt: integer("effective_due_at", { mode: "timestamp_ms" }),
    templateSnapshot: text("template_snapshot").notNull(),
    status: text("status", {
      enum: ["due", "posted", "skipped", "failed"],
    }).notNull(),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "transaction_schedule_occurrences_status_check",
      sql`${table.status} in ('due', 'posted', 'skipped', 'failed')`,
    ),
    check(
      "transaction_schedule_occurrences_sequence_check",
      sql`${table.sequenceNumber} > 0`,
    ),
    uniqueIndex(
      "transaction_schedule_occurrences_schedule_sequence_unique",
    ).on(table.scheduleId, table.sequenceNumber),
    uniqueIndex(
      "transaction_schedule_occurrences_schedule_nominal_unique",
    ).on(table.scheduleId, table.nominalDueAt),
    index("transaction_schedule_occurrences_status_due_index").on(
      table.status,
      table.effectiveDueAt,
    ),
  ],
);

export const transactionSchedulePostings = sqliteTable(
  "transaction_schedule_postings",
  {
    id: text("id").primaryKey(),
    occurrenceId: text("occurrence_id")
      .notNull()
      .references(() => transactionScheduleOccurrences.id, {
        onDelete: "cascade",
      }),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex(
      "transaction_schedule_postings_occurrence_transaction_unique",
    ).on(table.occurrenceId, table.transactionId),
    uniqueIndex("transaction_schedule_postings_transaction_unique").on(
      table.transactionId,
    ),
    index("transaction_schedule_postings_occurrence_index").on(
      table.occurrenceId,
    ),
  ],
);
