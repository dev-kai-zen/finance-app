import { db, type DbContext } from "@/infrastructure/database/client";
import { findSearchTransactionsRows } from "../repositories/transactions.repository";

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

export function escapeSqlLikeTerm(raw: string): string {
  return `%${raw
    .trim()
    .toLowerCase()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")}%`;
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
  const rows = findSearchTransactionsRows(term, limit, context);

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
