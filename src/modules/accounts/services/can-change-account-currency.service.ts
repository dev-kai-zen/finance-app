import { db, type DbContext } from "@/infrastructure/database/client";
import { hasTransactionHistoryForAccount } from "@/modules/transactions";

export function canChangeAccountCurrency(
  accountId: string,
  context: DbContext = db,
): boolean {
  return !hasTransactionHistoryForAccount(accountId, context);
}
