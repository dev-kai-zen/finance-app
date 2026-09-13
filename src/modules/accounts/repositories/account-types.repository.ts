import { eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accountTypes } from "@/infrastructure/database/schema";
import type { AccountType } from "../types/account.types";

export async function findAccountTypeById(
  id: string,
  context: DbContext = db,
): Promise<AccountType | null> {
  const [row] = await context
    .select()
    .from(accountTypes)
    .where(eq(accountTypes.id, id))
    .limit(1);

  return row ?? null;
}

export async function deleteAccountTypeById(
  id: string,
  context: DbContext = db,
): Promise<void> {
  await context.delete(accountTypes).where(eq(accountTypes.id, id));
}
