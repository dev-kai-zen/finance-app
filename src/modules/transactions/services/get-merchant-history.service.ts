import { and, desc, isNull, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export interface MerchantHistoryInsight {
  merchantName: string;
  mostFrequentCategoryId: string | null;
  mostFrequentAccountId: string | null;
  lastAmountMinorUnits: number | null;
  transactionCount: number;
}

/**
 * Analyses recent non-deleted transaction history for a given merchant name
 * to identify frequency-based preferences for category and payment account.
 */
export function getMerchantHistory(
  merchantName: string,
  context: DbContext = db,
): MerchantHistoryInsight | null {
  const cleanName = merchantName.trim().toLowerCase();
  if (!cleanName) {
    return null;
  }

  // Get matching transactions (non-deleted) ordered by occurredAt desc
  const rows = context
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      amountMinorUnits: transactions.amountMinorUnits,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(
      and(
        sql`lower(${transactions.name}) = ${cleanName}`,
        isNull(transactions.deletedAt),
      ),
    )
    .orderBy(desc(transactions.occurredAt))
    .limit(50)
    .all();

  if (rows.length === 0) {
    return null;
  }

  // Count category frequencies
  const categoryCounts = new Map<string, number>();
  // Count account frequencies
  const accountCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.categoryId) {
      categoryCounts.set(row.categoryId, (categoryCounts.get(row.categoryId) ?? 0) + 1);
    }
    if (row.accountId) {
      accountCounts.set(row.accountId, (accountCounts.get(row.accountId) ?? 0) + 1);
    }
  }

  let mostFrequentCategoryId: string | null = null;
  let maxCatCount = 0;
  for (const [catId, count] of categoryCounts.entries()) {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostFrequentCategoryId = catId;
    }
  }

  let mostFrequentAccountId: string | null = null;
  let maxAccCount = 0;
  for (const [accId, count] of accountCounts.entries()) {
    if (count > maxAccCount) {
      maxAccCount = count;
      mostFrequentAccountId = accId;
    }
  }

  return {
    merchantName: merchantName.trim(),
    mostFrequentCategoryId,
    mostFrequentAccountId,
    lastAmountMinorUnits: Math.abs(rows[0].amountMinorUnits),
    transactionCount: rows.length,
  };
}
