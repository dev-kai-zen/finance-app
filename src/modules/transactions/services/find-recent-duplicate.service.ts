import { db, type DbContext } from "@/infrastructure/database/client";
import { findRecentDuplicateTransactions } from "../repositories/transactions.repository";

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

  const rows = findRecentDuplicateTransactions(
    targetAmount,
    sinceDate,
    cleanName,
    5,
    context,
  );

  return {
    isDuplicate: rows.length > 0,
    duplicateCount: rows.length,
    lastOccurredAt: rows[0]?.occurredAt ?? null,
  };
}
