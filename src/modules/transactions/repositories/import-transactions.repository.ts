import { and, eq, gt, gte, isNull, lt, or, sql } from "drizzle-orm";
import type { DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export interface ImportComparisonCandidate {
  type: string; accountId: string; amount: number; date: Date;
}

export function listImportComparisonTransactions(
  candidate: ImportComparisonCandidate, context: DbContext,
  cursor?: { date: Date; id: string },
) {
  const start = new Date(candidate.date.getFullYear(), candidate.date.getMonth(), candidate.date.getDate());
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return context.select({
    id: transactions.id, type: transactions.type, accountId: transactions.accountId,
    amountMinorUnits: transactions.amountMinorUnits, occurredAt: transactions.occurredAt, name: transactions.name,
    toAccountId: sql<string>`coalesce((select incoming.account_id from transactions incoming
      where incoming.transaction_group_id = "transactions"."transaction_group_id"
        and incoming.deleted_at is null and incoming.type = 'transfer' and incoming.amount_minor_units > 0
      limit 1), '')`,
  }).from(transactions).where(and(
    isNull(transactions.deletedAt), eq(transactions.accountId, candidate.accountId),
    eq(transactions.type, candidate.type), eq(transactions.amountMinorUnits, candidate.type === "transfer" ? -Math.abs(candidate.amount) : candidate.amount),
    gte(transactions.occurredAt, start), lt(transactions.occurredAt, end),
    cursor ? or(gt(transactions.occurredAt, cursor.date), and(eq(transactions.occurredAt, cursor.date), gt(transactions.id, cursor.id))) : undefined,
  )).orderBy(transactions.occurredAt, transactions.id).limit(500).all();
}
