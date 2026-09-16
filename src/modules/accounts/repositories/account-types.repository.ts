import { asc, eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accountTypes, hexColors } from "@/infrastructure/database/schema";
import type { AccountType, NewAccountType } from "@/modules/accounts/types/account.types";

export function listAccountTypes(context: DbContext = db): AccountType[] {
  const rows = context
    .select({
      accountType: accountTypes,
      hexColor: hexColors,
    })
    .from(accountTypes)
    .leftJoin(hexColors, eq(accountTypes.hexColorsId, hexColors.id))
    .orderBy(asc(accountTypes.sortOrder), asc(accountTypes.name), asc(accountTypes.id))
    .all();

  return rows.map(({ accountType, hexColor }) => ({
    ...accountType,
    color: hexColor?.hex ?? (accountType.hexColorsId?.startsWith("color_") ? accountType.hexColorsId.replace("color_", "") : accountType.hexColorsId),
  }));
}

export function findAccountTypeById(id: string, context: DbContext = db): AccountType | null {
  const row = context
    .select({
      accountType: accountTypes,
      hexColor: hexColors,
    })
    .from(accountTypes)
    .leftJoin(hexColors, eq(accountTypes.hexColorsId, hexColors.id))
    .where(eq(accountTypes.id, id))
    .get();

  return row
    ? {
        ...row.accountType,
        color: row.hexColor?.hex ?? (row.accountType.hexColorsId?.startsWith("color_") ? row.accountType.hexColorsId.replace("color_", "") : row.accountType.hexColorsId),
      }
    : null;
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
