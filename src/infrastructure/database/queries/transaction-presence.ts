import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export function hasTransactions(context: DbContext = db): boolean {
  return Boolean(
    context
      .select({ id: transactions.id })
      .from(transactions)
      .limit(1)
      .get(),
  );
}
