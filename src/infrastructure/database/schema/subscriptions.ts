import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { DEFAULT_BASE_CURRENCY } from "@/utils/currency";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { merchants } from "./merchants";
import { pockets } from "./pockets";
import { transactionSchedules } from "./transaction-schedules";
import { transactions } from "./transactions";

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status", {
      enum: ["active", "paused", "cancelled", "trial"],
    })
      .notNull()
      .default("active"),
    amountMinorUnits: integer("amount_minor_units").notNull(),
    currencyCode: text("currency_code")
      .notNull()
      .default(DEFAULT_BASE_CURRENCY),
    billingCycle: text("billing_cycle", {
      enum: ["weekly", "monthly", "quarterly", "semi_annual", "yearly"],
    })
      .notNull()
      .default("monthly"),
    billingCycleInterval: integer("billing_cycle_interval")
      .notNull()
      .default(1),
    firstBillingDate: integer("first_billing_date", {
      mode: "timestamp_ms",
    }).notNull(),
    nextRenewalDate: integer("next_renewal_date", {
      mode: "timestamp_ms",
    }).notNull(),
    trialEndsAt: integer("trial_ends_at", { mode: "timestamp_ms" }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    pocketId: text("pocket_id").references(() => pockets.id, {
      onDelete: "set null",
    }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    merchantId: text("merchant_id").references(() => merchants.id, {
      onDelete: "set null",
    }),
    scheduleId: text("schedule_id").references(() => transactionSchedules.id, {
      onDelete: "set null",
    }),
    endsOn: integer("ends_on", { mode: "timestamp_ms" }),
    autoPost: integer("auto_post", { mode: "boolean" })
      .notNull()
      .default(false),
    reminderLeadDays: text("reminder_lead_days").notNull().default("[1,3]"),
    cancellationUrl: text("cancellation_url"),
    notes: text("notes"),
    color: text("color"),
    icon: text("icon"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    check(
      "subscriptions_status_check",
      sql`${table.status} in ('active', 'paused', 'cancelled', 'trial')`,
    ),
    check(
      "subscriptions_billing_cycle_check",
      sql`${table.billingCycle} in ('weekly', 'monthly', 'quarterly', 'semi_annual', 'yearly')`,
    ),
    check("subscriptions_amount_check", sql`${table.amountMinorUnits} >= 0`),
    index("subscriptions_status_renewal_idx").on(
      table.status,
      table.nextRenewalDate,
    ),
    index("subscriptions_account_idx").on(table.accountId),
    index("subscriptions_pocket_idx").on(table.pocketId),
    index("subscriptions_category_idx").on(table.categoryId),
    index("subscriptions_schedule_idx").on(table.scheduleId),
  ],
);

export const subscriptionPayments = sqliteTable(
  "subscription_payments",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }).notNull(),
    amountMinorUnits: integer("amount_minor_units").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("subscription_payments_sub_idx").on(table.subscriptionId),
    index("subscription_payments_tx_idx").on(table.transactionId),
  ],
);

export type SubscriptionRecord = typeof subscriptions.$inferSelect;
export type NewSubscriptionRecord = typeof subscriptions.$inferInsert;
export type SubscriptionPaymentRecord = typeof subscriptionPayments.$inferSelect;
export type NewSubscriptionPaymentRecord = typeof subscriptionPayments.$inferInsert;
