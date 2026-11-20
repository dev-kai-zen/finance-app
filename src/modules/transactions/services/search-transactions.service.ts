import { and, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accounts,
  categories,
  transactions,
} from "@/infrastructure/database/schema";

export interface TransactionSearchResult {
  id: string;
  name: string | null;
  note: string | null;
  categoryName: string | null;
  occurredAt: Date;
  amountMinorUnits: number;
  currencyCode: string;
  type: string;
}

function escapeSqlLikeTerm(raw: string): string {
  return `%${raw
    .trim()
    .toLowerCase()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")}%`;
}

/**
 * Excludes the secondary (`inLeg`) row of a 2-leg active transfer group so
 * each transfer only appears once in Global Search results.
 */
function canonicalLogicalTransactionCondition(): SQL {
  return sql`NOT (
    "transactions"."type" = 'transfer'
    AND "transactions"."transaction_group_id" IS NOT NULL
    AND (
      SELECT count(*) FROM transactions g
      WHERE g.deleted_at IS NULL
        AND g.type = 'transfer'
        AND g.transaction_group_id = "transactions"."transaction_group_id"
    ) = 2
    AND EXISTS (
      SELECT 1 FROM transactions other_leg
      WHERE other_leg.deleted_at IS NULL
        AND other_leg.type = 'transfer'
        AND other_leg.transaction_group_id = "transactions"."transaction_group_id"
        AND other_leg.id != "transactions"."id"
        AND (
          (other_leg.amount_minor_units < 0 AND "transactions"."amount_minor_units" >= 0)
          OR (
            ((other_leg.amount_minor_units < 0) = ("transactions"."amount_minor_units" < 0))
            AND other_leg.id < "transactions"."id"
          )
        )
    )
  )`;
}

export function searchTransactions(
  searchQuery: string,
  limit: number = 8,
  context: DbContext = db,
): TransactionSearchResult[] {
  const trimmed = searchQuery.trim();
  if (!trimmed) {
    return [];
  }
  const term = escapeSqlLikeTerm(trimmed);

  const rows = context
    .select({
      id: transactions.id,
      name: transactions.name,
      note: transactions.note,
      categoryName: sql<string | null>`coalesce(
        ${categories.name},
        (
          SELECT sc.name
          FROM transaction_entries se
          INNER JOIN categories sc ON sc.id = se.category_id
          WHERE se.transaction_id = "transactions"."id"
            AND (
              lower(sc.name) LIKE ${term} ESCAPE '\\'
              OR lower(coalesce(se.note, '')) LIKE ${term} ESCAPE '\\'
            )
          ORDER BY se.created_at ASC, se.id ASC
          LIMIT 1
        ),
        (
          SELECT sc.name
          FROM transaction_entries se
          INNER JOIN categories sc ON sc.id = se.category_id
          WHERE se.transaction_id = "transactions"."id"
          ORDER BY se.created_at ASC, se.id ASC
          LIMIT 1
        )
      )`,
      occurredAt: transactions.occurredAt,
      amountMinorUnits: transactions.amountMinorUnits,
      currencyCode: sql<string>`coalesce(${accounts.currencyCode}, ${transactions.currencyCode})`,
      type: transactions.type,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        isNull(transactions.deletedAt),
        canonicalLogicalTransactionCondition(),
        sql`(
          lower(coalesce("transactions"."name", '')) LIKE ${term} ESCAPE '\\'
          OR lower(coalesce("transactions"."note", '')) LIKE ${term} ESCAPE '\\'
          OR lower(coalesce(${categories.name}, '')) LIKE ${term} ESCAPE '\\'
          OR EXISTS (
            SELECT 1
            FROM transaction_entries se
            INNER JOIN categories sc ON sc.id = se.category_id
            WHERE se.transaction_id = "transactions"."id"
              AND (
                lower(sc.name) LIKE ${term} ESCAPE '\\'
                OR lower(coalesce(se.note, '')) LIKE ${term} ESCAPE '\\'
              )
          )
        )`,
      ),
    )
    .orderBy(desc(transactions.occurredAt))
    .limit(limit)
    .all();

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    note: r.note,
    categoryName: r.categoryName,
    occurredAt: r.occurredAt,
    amountMinorUnits:
      r.type === "transfer" ? Math.abs(r.amountMinorUnits) : r.amountMinorUnits,
    currencyCode: r.currencyCode,
    type: r.type,
  }));
}
