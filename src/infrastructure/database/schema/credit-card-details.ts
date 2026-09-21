import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { accounts } from "./accounts";

export const creditCardDetails = sqliteTable(
  "credit_card_details",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    creditLimitMinorUnits: integer("credit_limit_minor_units").notNull(),
    statementDay: integer("statement_day").notNull(),
    paymentDueDay: integer("payment_due_day").notNull(),
  },
  (table) => [
    check(
      "credit_card_details_credit_limit_check",
      sql`${table.creditLimitMinorUnits} >= 0`,
    ),
    check(
      "credit_card_details_statement_day_check",
      sql`${table.statementDay} BETWEEN 1 AND 31`,
    ),
    check(
      "credit_card_details_payment_due_day_check",
      sql`${table.paymentDueDay} BETWEEN 1 AND 31`,
    ),
  ],
);

export type CreditCardDetailsTable = typeof creditCardDetails;
