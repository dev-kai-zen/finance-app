import { and, desc, gte, isNull, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export interface DuplicateCheckInput {
  amountMinorUnits: number;
  name?: string | null;
  hoursLookback?: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateCount: number;
  lastOccurredAt: Date | null;
}

/**
 * Checks if a transaction with the same amount and merchant name
 * was recently recorded within the specified lookback window (default: 24h).
 */
export function findRecentDuplicateTransaction(
  input: DuplicateCheckInput,
  context: DbContext = db,
): DuplicateCheckResult {
  const hours = input.hoursLookback ?? 24;
  const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  const targetAmount = Math.abs(input.amountMinorUnits);
  const cleanName = input.name?.trim().toLowerCase();

  const conditions = [
    sql`abs(${transactions.amountMinorUnits}) = ${targetAmount}`,
    gte(transactions.occurredAt, sinceDate),
    isNull(transactions.deletedAt),
  ];

  if (cleanName) {
    conditions.push(sql`lower(${transactions.name}) = ${cleanName}`);
  }

  const rows = context
    .select({
      id: transactions.id,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredAt))
    .limit(5)
    .all();

  return {
    isDuplicate: rows.length > 0,
    duplicateCount: rows.length,
    lastOccurredAt: rows[0]?.occurredAt ?? null,
  };
}
