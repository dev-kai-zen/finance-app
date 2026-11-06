import { isNull } from "drizzle-orm";
import type { DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export function listImportComparisonTransactions(context: DbContext) {
  return context.select().from(transactions).where(isNull(transactions.deletedAt)).all();
}
