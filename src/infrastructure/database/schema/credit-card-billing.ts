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
import { transactions } from "./transactions";

export const creditCardStatements = sqliteTable(
  "credit_card_statements",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    cycleStartOn: text("cycle_start_on").notNull(),
    cycleEndOn: text("cycle_end_on").notNull(),
    statementOn: text("statement_on").notNull(),
    dueOn: text("due_on").notNull(),
    issuedAmountMinorUnits: integer("issued_amount_minor_units")
      .notNull()
      .default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "credit_card_statements_kind_check",
      sql`${table.kind} IN ('opening', 'billing_cycle')`,
    ),
    check(
      "credit_card_statements_issued_amount_check",
      sql`${table.issuedAmountMinorUnits} >= 0`,
    ),
    uniqueIndex("credit_card_statements_account_statement_unique").on(
      table.accountId,
      table.statementOn,
      table.kind,
    ),
    index("credit_card_statements_account_due_index").on(
      table.accountId,
      table.dueOn,
    ),
  ],
);

export const creditCardInstallmentPlans = sqliteTable(
  "credit_card_installment_plans",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    purchaseTransactionId: text("purchase_transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    termMonths: integer("term_months").notNull(),
    principalMinorUnits: integer("principal_minor_units").notNull(),
    firstStatementOn: text("first_statement_on").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "credit_card_installment_plans_term_check",
      sql`${table.termMonths} BETWEEN 2 AND 120`,
    ),
    check(
      "credit_card_installment_plans_principal_check",
      sql`${table.principalMinorUnits} > 0`,
    ),
    check(
      "credit_card_installment_plans_status_check",
      sql`${table.status} IN ('active', 'completed', 'cancelled')`,
    ),
    uniqueIndex("credit_card_installment_plans_transaction_unique").on(
      table.purchaseTransactionId,
    ),
    index("credit_card_installment_plans_account_status_index").on(
      table.accountId,
      table.status,
    ),
  ],
);

export const creditCardInstallments = sqliteTable(
  "credit_card_installments",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => creditCardInstallmentPlans.id, { onDelete: "cascade" }),
    installmentNumber: integer("installment_number").notNull(),
    scheduledStatementOn: text("scheduled_statement_on").notNull(),
    principalMinorUnits: integer("principal_minor_units").notNull(),
    interestMinorUnits: integer("interest_minor_units").notNull().default(0),
    feeMinorUnits: integer("fee_minor_units").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "credit_card_installments_number_check",
      sql`${table.installmentNumber} > 0`,
    ),
    check(
      "credit_card_installments_amounts_check",
      sql`${table.principalMinorUnits} > 0 AND ${table.interestMinorUnits} >= 0 AND ${table.feeMinorUnits} >= 0`,
    ),
    uniqueIndex("credit_card_installments_plan_number_unique").on(
      table.planId,
      table.installmentNumber,
    ),
    index("credit_card_installments_statement_index").on(
      table.scheduledStatementOn,
    ),
  ],
);

export const creditCardStatementEntries = sqliteTable(
  "credit_card_statement_entries",
  {
    id: text("id").primaryKey(),
    statementId: text("statement_id")
      .notNull()
      .references(() => creditCardStatements.id, { onDelete: "cascade" }),
    transactionId: text("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    installmentId: text("installment_id").references(
      () => creditCardInstallments.id,
      { onDelete: "set null" },
    ),
    entryType: text("entry_type").notNull(),
    amountMinorUnits: integer("amount_minor_units").notNull(),
    descriptionSnapshot: text("description_snapshot"),
    occurredOnSnapshot: text("occurred_on_snapshot").notNull(),
    reversesEntryId: text("reverses_entry_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "credit_card_statement_entries_type_check",
      sql`${table.entryType} IN ('opening_balance', 'charge', 'installment', 'refund', 'payment', 'adjustment')`,
    ),
    check(
      "credit_card_statement_entries_amount_check",
      sql`${table.amountMinorUnits} != 0`,
    ),
    index("credit_card_statement_entries_statement_index").on(
      table.statementId,
    ),
    index("credit_card_statement_entries_transaction_index").on(
      table.transactionId,
    ),
    index("credit_card_statement_entries_installment_index").on(
      table.installmentId,
    ),
  ],
);

export type CreditCardStatementTable = typeof creditCardStatements;
export type CreditCardStatementEntryTable = typeof creditCardStatementEntries;
export type CreditCardInstallmentPlanTable = typeof creditCardInstallmentPlans;
export type CreditCardInstallmentTable = typeof creditCardInstallments;
