import { asc, eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accountTypes } from "@/infrastructure/database/schema";
import type { AccountType, NewAccountType } from "@/modules/accounts/types/account.types";

export function listAccountTypes(context: DbContext = db): AccountType[] {
  return context.select().from(accountTypes)
    .orderBy(asc(accountTypes.sortOrder), asc(accountTypes.name), asc(accountTypes.id)).all();
}
export function findAccountTypeById(id: string, context: DbContext = db): AccountType | null {
  return context.select().from(accountTypes).where(eq(accountTypes.id, id)).get() ?? null;
}
export function insertAccountType(value: NewAccountType, context: DbContext = db) {
  context.insert(accountTypes).values(value).run();
}
export function updateAccountTypeRecord(id: string, values: Partial<Omit<NewAccountType, "id" | "createdAt">>, context: DbContext = db) {
  context.update(accountTypes).set(values).where(eq(accountTypes.id, id)).run();
}
export function deleteAccountTypeById(id: string, context: DbContext = db): void {
  context.delete(accountTypes).where(eq(accountTypes.id, id)).run();
}
