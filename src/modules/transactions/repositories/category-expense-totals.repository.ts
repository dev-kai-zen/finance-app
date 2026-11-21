import { and, eq, gte, inArray, isNull, lte, ne, notExists, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accounts, transactionEntries, transactions } from "@/infrastructure/database/schema";
import { categoryIdChunks } from "../utils/category-id-chunks";

/** Aggregate unsplit expenses; split parents are counted through their entries. */
export function listUnsplitExpenseTotals(
  query: {
    categoryIds?: string[];
    groupByCategory?: boolean;
    startDate: Date;
    endDate: Date;
    excludeTransactionId?: string | null;
  },
  context: DbContext = db,
) {
  const rows: { categoryId: string | null; currencyCode: string; total: number }[] = [];
  for (const categoryIds of categoryIdChunks(query.categoryIds)) {
    rows.push(...context
      .select({
        categoryId: query.groupByCategory === false ? sql<null>`null` : transactions.categoryId,
        currencyCode: accounts.currencyCode,
        total: sql<number>`coalesce(sum(abs(${transactions.amountMinorUnits})), 0)`.as("total"),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(
        isNull(transactions.deletedAt),
        eq(transactions.type, "expense"),
        categoryIds ? inArray(transactions.categoryId, categoryIds) : undefined,
        gte(transactions.occurredAt, query.startDate),
        lte(transactions.occurredAt, query.endDate),
        query.excludeTransactionId ? ne(transactions.id, query.excludeTransactionId) : undefined,
        notExists(context.select({ id: transactionEntries.id })
          .from(transactionEntries)
          .where(eq(transactionEntries.transactionId, sql`"transactions"."id"`))),
      ))
      .groupBy(...(query.groupByCategory === false
        ? [accounts.currencyCode]
        : [transactions.categoryId, accounts.currencyCode]))
      .all());
  }
  return rows;
}
