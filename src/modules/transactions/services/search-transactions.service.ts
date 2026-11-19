import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { categories, transactions } from "@/infrastructure/database/schema";

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

export function searchTransactions(
  searchQuery: string,
  limit: number = 8,
  context: DbContext = db,
): TransactionSearchResult[] {
  const trimmed = searchQuery.trim();
  if (!trimmed) {
    return [];
  }
  const term = `%${trimmed.toLowerCase()}%`;

  const rows = context
    .select({
      id: transactions.id,
      name: transactions.name,
      note: transactions.note,
      categoryName: categories.name,
      occurredAt: transactions.occurredAt,
      amountMinorUnits: transactions.amountMinorUnits,
      currencyCode: transactions.currencyCode,
      type: transactions.type,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        isNull(transactions.deletedAt),
        or(
          like(sql`lower(${transactions.name})`, term),
          like(sql`lower(${transactions.note})`, term),
          like(sql`lower(${categories.name})`, term),
        ),
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
    amountMinorUnits: r.amountMinorUnits,
    currencyCode: r.currencyCode,
    type: r.type,
  }));
}
