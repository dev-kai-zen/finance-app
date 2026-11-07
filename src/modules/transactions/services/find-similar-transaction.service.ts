import { and, between, eq, isNull, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export interface SimilarTransactionCheckInput {
  type: string; // "income" | "expense" | "transfer"
  accountId: string;
  destinationAccountId?: string | null;
  occurredAt: Date;
  amountMinorUnits: number;
  description?: string | null;
}

export function findSimilarTransaction(
  input: SimilarTransactionCheckInput,
  context: DbContext = db,
): boolean {
  const date = input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const targetAmount = Math.abs(input.amountMinorUnits);
  const cleanDescription = (input.description ?? "").trim().toLowerCase();

  const conditions = [
    eq(transactions.type, input.type),
    eq(transactions.accountId, input.accountId),
    between(transactions.occurredAt, startOfDay, endOfDay),
    sql`abs(${transactions.amountMinorUnits}) = ${targetAmount}`,
    isNull(transactions.deletedAt),
  ];

  if (cleanDescription) {
    conditions.push(sql`trim(lower(coalesce(${transactions.name}, ''))) = ${cleanDescription}`);
  } else {
    conditions.push(sql`((${transactions.name} IS NULL) OR trim(${transactions.name}) = '')`);
  }

  const matchingRows = context
    .select({
      id: transactions.id,
      transactionGroupId: transactions.transactionGroupId,
    })
    .from(transactions)
    .where(and(...conditions))
    .all();

  if (matchingRows.length === 0) {
    return false;
  }

  if (input.type === "transfer" && input.destinationAccountId) {
    // Check if any matching outLeg has a paired leg for the destination account
    const groupIds = matchingRows
      .map((r) => r.transactionGroupId)
      .filter((gid): gid is string => Boolean(gid));

    if (groupIds.length === 0) {
      return false;
    }

    for (const gid of groupIds) {
      const pairedLeg = context
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.transactionGroupId, gid),
            eq(transactions.accountId, input.destinationAccountId),
            isNull(transactions.deletedAt),
          ),
        )
        .get();

      if (pairedLeg) {
        return true;
      }
    }

    return false;
  }

  return true;
}

