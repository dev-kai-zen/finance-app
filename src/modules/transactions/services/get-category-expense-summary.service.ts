import { and, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";
import {
  createCurrencyMinorUnitsBucket,
  addToCurrencyMinorUnitsBucket,
  sumCurrencyMinorUnitsBucketsToTarget,
  getCurrencyPreferences,
  getExchangeRateMap,
} from "@/modules/currencies";
import { DEFAULT_BASE_CURRENCY } from "@/utils/currency";

export interface CategoryExpenseSummaryQuery {
  categoryIds: string[];
  startDate: Date;
  endDate: Date;
  excludeTransactionId?: string | null;
  /** Sum expenses converted into this currency (defaults to app default currency). */
  targetCurrencyCode?: string;
}

/**
 * Calculates total expenses in positive minor units for the given categories,
 * grouped by transaction currency then converted to the target currency.
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

  const rows = context
    .select({
      currencyCode: transactions.currencyCode,
      total: sql<number>`coalesce(sum(abs(${transactions.amountMinorUnits})), 0)`.as(
        "total",
      ),
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(transactions.currencyCode)
    .all();

  const buckets = createCurrencyMinorUnitsBucket();
  for (const row of rows) {
    addToCurrencyMinorUnitsBucket(
      buckets,
      row.currencyCode,
      Math.abs(Number(row.total) || 0),
    );
  }

  const targetCurrency =
    query.targetCurrencyCode?.trim().toUpperCase() ??
    getCurrencyPreferences(context).defaultCurrency;
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);

  return sumCurrencyMinorUnitsBucketsToTarget(buckets, targetCurrency, {
    ratesMap,
    context,
  });
}

/**
 * Calculates total expenses grouped by category ID for a given period (native minor units per category — not converted).
 */
export function getCategoryExpenseTotalsGrouped(
  query: {
    categoryIds: string[];
    startDate: Date;
    endDate: Date;
    targetCurrencyCode?: string;
  },
  context: DbContext = db,
): Record<string, number> {
  if (!query.categoryIds.length) {
    return {};
  }

  const targetCurrency =
    query.targetCurrencyCode?.trim().toUpperCase() ??
    getCurrencyPreferences(context).defaultCurrency;
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);

  const rows = context
    .select({
      categoryId: transactions.categoryId,
      currencyCode: transactions.currencyCode,
      total: sql<number>`coalesce(sum(abs(${transactions.amountMinorUnits})), 0)`.as(
        "total",
      ),
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
    .groupBy(transactions.categoryId, transactions.currencyCode)
    .all();

  const bucketsByCategory = new Map<string, ReturnType<typeof createCurrencyMinorUnitsBucket>>();

  for (const row of rows) {
    if (!row.categoryId) continue;
    const buckets =
      bucketsByCategory.get(row.categoryId) ?? createCurrencyMinorUnitsBucket();
    addToCurrencyMinorUnitsBucket(
      buckets,
      row.currencyCode,
      Math.abs(Number(row.total) || 0),
    );
    bucketsByCategory.set(row.categoryId, buckets);
  }

  const totals: Record<string, number> = {};
  for (const [categoryId, buckets] of bucketsByCategory) {
    totals[categoryId] = sumCurrencyMinorUnitsBucketsToTarget(
      buckets,
      targetCurrency,
      { ratesMap, context },
    );
  }
  return totals;
}
