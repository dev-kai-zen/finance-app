import { and, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export interface CategoryExpenseSummaryQuery {
  categoryIds: string[];
  startDate: Date;
  endDate: Date;
  excludeTransactionId?: string | null;
}

/**
 * Calculates total expenses in positive minor units (cents) for the given
 * categories within a time range. Used by the budgeting module to evaluate
 * current spending against budget limits.
 */
export function getCategoryExpenseTotal(
  query: CategoryExpenseSummaryQuery,
  context: DbContext = db,
): number {
  if (!query.categoryIds.length) {
    return 0;
  }

  const conditions = [
    isNull(transactions.deletedAt),
    eq(transactions.type, "expense"),
    inArray(transactions.categoryId, query.categoryIds),
    gte(transactions.occurredAt, query.startDate),
    lte(transactions.occurredAt, query.endDate),
  ];

  if (query.excludeTransactionId) {
    conditions.push(ne(transactions.id, query.excludeTransactionId));
  }

  const result = context
    .select({
      total: sql<number>`coalesce(sum(abs(${transactions.amountCents})), 0)`.as("total"),
    })
    .from(transactions)
    .where(and(...conditions))
    .get();

  return Math.abs(Number(result?.total) || 0);
}

/**
 * Calculates total expenses grouped by category ID for a given period.
 */
export function getCategoryExpenseTotalsGrouped(
  query: {
    categoryIds: string[];
    startDate: Date;
    endDate: Date;
  },
  context: DbContext = db,
): Record<string, number> {
  if (!query.categoryIds.length) {
    return {};
  }

  const rows = context
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`coalesce(sum(abs(${transactions.amountCents})), 0)`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        eq(transactions.type, "expense"),
        inArray(transactions.categoryId, query.categoryIds),
        gte(transactions.occurredAt, query.startDate),
        lte(transactions.occurredAt, query.endDate),
      ),
    )
    .groupBy(transactions.categoryId)
    .all();

  const totals: Record<string, number> = {};
  for (const row of rows) {
    if (row.categoryId) {
      totals[row.categoryId] = Math.abs(Number(row.total) || 0);
    }
  }
  return totals;
}
