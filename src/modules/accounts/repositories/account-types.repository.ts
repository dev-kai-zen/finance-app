import { asc, eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accountTypes } from "@/infrastructure/database/schema";
import type { AccountType, NewAccountType } from "@/modules/accounts/types/account.types";

function mapAccountType(row: typeof accountTypes.$inferSelect): AccountType {
  const color = row.hexColorsId
    ? row.hexColorsId.startsWith("color_")
      ? row.hexColorsId.replace("color_", "")
      : row.hexColorsId
    : null;
  return {
    ...row,
    color,
  };
}

export function listAccountTypes(context: DbContext = db): AccountType[] {
  return context
    .select()
    .from(accountTypes)
    .orderBy(asc(accountTypes.sortOrder), asc(accountTypes.name), asc(accountTypes.id))
    .all()
    .map(mapAccountType);
}
export function findAccountTypeById(id: string, context: DbContext = db): AccountType | null {
  const row = context.select().from(accountTypes).where(eq(accountTypes.id, id)).get();
  return row ? mapAccountType(row) : null;
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
