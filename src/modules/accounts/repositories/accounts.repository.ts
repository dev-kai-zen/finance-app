import { asc, eq, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accounts,
  accountTypes,
  creditCardDetails,
} from "@/infrastructure/database/schema";
import type { Account, AccountListItem, NewAccount } from "@/modules/accounts/types/account.types";

export function listAccounts(context: DbContext = db): AccountListItem[] {
  const rows = context.select({
    account: accounts,
    accountType: accountTypes,
    creditCardDetails,
  }).from(accounts)
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(creditCardDetails, eq(accounts.id, creditCardDetails.accountId))
    .orderBy(asc(accounts.sortOrder), asc(accounts.name), asc(accounts.id)).all();

  return rows.map(({ account, accountType, creditCardDetails }) => ({
    ...account,
    accountType,
    creditCardDetails,
    currentBalanceMinorUnits: account.openingBalanceMinorUnits,
  }));
}
export function findAccountById(id: string, context: DbContext = db) {
  return context.select().from(accounts).where(eq(accounts.id, id)).get() ?? null;
}
export function findAccountsByAccountTypeId(accountTypeId: string, context: DbContext = db): Account[] {
  return context.select().from(accounts).where(eq(accounts.accountTypeId, accountTypeId))
    .orderBy(asc(accounts.sortOrder), asc(accounts.name), asc(accounts.id)).all();
}
export function insertAccount(value: NewAccount, context: DbContext = db) {
  context.insert(accounts).values(value).run();
}
export function updateAccountRecord(id: string, values: Partial<Omit<NewAccount, "id" | "createdAt">>, context: DbContext = db) {
  context.update(accounts).set(values).where(eq(accounts.id, id)).run();
}
export function deleteAllAccountRecords(context: DbContext = db): void {
  context.delete(accounts).run();
}
export function reassignAccountsType(fromAccountTypeId: string, toAccountTypeId: string, updatedAt = new Date(), context: DbContext = db): void {
  context.update(accounts).set({ accountTypeId: toAccountTypeId, updatedAt })
    .where(eq(accounts.accountTypeId, fromAccountTypeId)).run();
}
/** SQLite supplies random IDs without an additional platform dependency. */
export function newAccountRecordId(context: DbContext = db): string {
  return context.get<{ id: string }>(sql`SELECT lower(hex(randomblob(16))) AS id`)!.id;
}
