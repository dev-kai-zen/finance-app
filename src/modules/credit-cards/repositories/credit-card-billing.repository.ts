import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import {
  creditCardInstallmentPlans,
  creditCardInstallments,
  creditCardStatementEntries,
  creditCardStatements,
} from "@/infrastructure/database/schema";

export function newCreditCardBillingId(context: DbContext = db): string {
  return context.get<{ id: string }>(
    sql`SELECT lower(hex(randomblob(16))) AS id`,
  )!.id;
}

export function findStatement(
  accountId: string,
  statementOn: string,
  kind: "opening" | "billing_cycle",
  context: DbContext = db,
) {
  return (
    context
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.accountId, accountId),
          eq(creditCardStatements.statementOn, statementOn),
          eq(creditCardStatements.kind, kind),
        ),
      )
      .get() ?? null
  );
}

export function insertStatement(
  value: typeof creditCardStatements.$inferInsert,
  context: DbContext = db,
): typeof creditCardStatements.$inferSelect {
  const record: typeof creditCardStatements.$inferSelect = {
    ...value,
    issuedAmountMinorUnits: value.issuedAmountMinorUnits ?? 0,
  };
  context.insert(creditCardStatements).values(record).run();
  return record;
}

export function updateStatementIssuedAmount(
  id: string,
  amountMinorUnits: number,
  context: DbContext = db,
) {
  context
    .update(creditCardStatements)
    .set({ issuedAmountMinorUnits: amountMinorUnits, updatedAt: new Date() })
    .where(eq(creditCardStatements.id, id))
    .run();
}

export function listStatementsForAccount(
  accountId: string,
  context: DbContext = db,
) {
  return context
    .select()
    .from(creditCardStatements)
    .where(eq(creditCardStatements.accountId, accountId))
    .orderBy(asc(creditCardStatements.statementOn))
    .all();
}

export function listEntriesForStatements(
  statementIds: string[],
  context: DbContext = db,
) {
  if (statementIds.length === 0) return [];
  return context
    .select()
    .from(creditCardStatementEntries)
    .where(inArray(creditCardStatementEntries.statementId, statementIds))
    .orderBy(
      asc(creditCardStatementEntries.occurredOnSnapshot),
      asc(creditCardStatementEntries.createdAt),
    )
    .all();
}

export function listEntriesForTransaction(
  transactionId: string,
  context: DbContext = db,
) {
  return context
    .select()
    .from(creditCardStatementEntries)
    .where(eq(creditCardStatementEntries.transactionId, transactionId))
    .all();
}

export function findEntryForInstallment(
  installmentId: string,
  context: DbContext = db,
) {
  return (
    context
      .select()
      .from(creditCardStatementEntries)
      .where(eq(creditCardStatementEntries.installmentId, installmentId))
      .get() ?? null
  );
}

export function insertStatementEntry(
  value: typeof creditCardStatementEntries.$inferInsert,
  context: DbContext = db,
) {
  context.insert(creditCardStatementEntries).values(value).run();
  return value;
}

export function insertInstallmentPlan(
  value: typeof creditCardInstallmentPlans.$inferInsert,
  context: DbContext = db,
) {
  context.insert(creditCardInstallmentPlans).values(value).run();
  return value;
}

export function insertInstallments(
  values: Array<typeof creditCardInstallments.$inferInsert>,
  context: DbContext = db,
) {
  if (values.length > 0) {
    context.insert(creditCardInstallments).values(values).run();
  }
  return values;
}

export function findInstallmentPlanByTransactionId(
  transactionId: string,
  context: DbContext = db,
) {
  return (
    context
      .select()
      .from(creditCardInstallmentPlans)
      .where(
        eq(creditCardInstallmentPlans.purchaseTransactionId, transactionId),
      )
      .get() ?? null
  );
}

export function listInstallmentPlansForAccount(
  accountId: string,
  context: DbContext = db,
) {
  return context
    .select()
    .from(creditCardInstallmentPlans)
    .where(eq(creditCardInstallmentPlans.accountId, accountId))
    .all();
}

export function updateInstallmentPlanStatus(
  id: string,
  status: "active" | "completed" | "cancelled",
  context: DbContext = db,
) {
  context
    .update(creditCardInstallmentPlans)
    .set({ status, updatedAt: new Date() })
    .where(eq(creditCardInstallmentPlans.id, id))
    .run();
}

export function listInstallmentsForPlans(
  planIds: string[],
  context: DbContext = db,
) {
  if (planIds.length === 0) return [];
  return context
    .select()
    .from(creditCardInstallments)
    .where(inArray(creditCardInstallments.planId, planIds))
    .orderBy(
      asc(creditCardInstallments.scheduledStatementOn),
      asc(creditCardInstallments.installmentNumber),
    )
    .all();
}
