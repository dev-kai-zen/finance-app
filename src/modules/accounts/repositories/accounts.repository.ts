import { eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accounts } from "@/infrastructure/database/schema";
import type { Account } from "../types/account.types";

export async function findAccountsByAccountTypeId(
  accountTypeId: string,
  context: DbContext = db,
): Promise<Account[]> {
  return context
    .select()
    .from(accounts)
    .where(eq(accounts.accountTypeId, accountTypeId));
}

export async function reassignAccountsType(
  fromAccountTypeId: string,
  toAccountTypeId: string,
  updatedAt: Date = new Date(),
  context: DbContext = db,
): Promise<void> {
  await context
    .update(accounts)
    .set({
      accountTypeId: toAccountTypeId,
      updatedAt,
    })
    .where(eq(accounts.accountTypeId, fromAccountTypeId));
}
