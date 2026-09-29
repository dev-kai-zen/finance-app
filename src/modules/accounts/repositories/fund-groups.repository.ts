import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  fundGroupAccounts,
  fundGroupPockets,
  fundGroups,
} from "@/infrastructure/database/schema";
import type {
  FundGroup,
  FundGroupAccount,
  FundGroupPocket,
  NewFundGroup,
} from "@/modules/accounts/types/fund-group.types";

export function listFundGroups(context: DbContext = db): FundGroup[] {
  return context
    .select()
    .from(fundGroups)
    .orderBy(asc(fundGroups.sortOrder), asc(fundGroups.name), asc(fundGroups.id))
    .all();
}

export function findFundGroupById(
  id: string,
  context: DbContext = db,
): FundGroup | null {
  return context.select().from(fundGroups).where(eq(fundGroups.id, id)).get() ?? null;
}

export function findFundGroupByNormalizedName(
  nameNormalized: string,
  excludingId?: string,
  context: DbContext = db,
): FundGroup | null {
  const condition = excludingId
    ? and(
        eq(fundGroups.nameNormalized, nameNormalized),
        ne(fundGroups.id, excludingId),
      )
    : eq(fundGroups.nameNormalized, nameNormalized);
  return context.select().from(fundGroups).where(condition).get() ?? null;
}

export function insertFundGroup(value: NewFundGroup, context: DbContext = db): void {
  context.insert(fundGroups).values(value).run();
}

export function updateFundGroupRecord(
  id: string,
  values: Partial<Omit<NewFundGroup, "id" | "createdAt">>,
  context: DbContext = db,
): void {
  context.update(fundGroups).set(values).where(eq(fundGroups.id, id)).run();
}

export function deleteFundGroupRecord(id: string, context: DbContext = db): void {
  context.delete(fundGroups).where(eq(fundGroups.id, id)).run();
}

export function deleteAllFundGroupRecords(context: DbContext = db): void {
  context.delete(fundGroups).run();
}

export function listFundGroupAccounts(context: DbContext = db): FundGroupAccount[] {
  return context
    .select()
    .from(fundGroupAccounts)
    .orderBy(asc(fundGroupAccounts.fundGroupId), asc(fundGroupAccounts.sortOrder))
    .all();
}

export function listFundGroupPockets(context: DbContext = db): FundGroupPocket[] {
  return context
    .select()
    .from(fundGroupPockets)
    .orderBy(asc(fundGroupPockets.fundGroupId), asc(fundGroupPockets.sortOrder))
    .all();
}

export function replaceFundGroupAccounts(
  fundGroupId: string,
  accountIds: string[],
  context: DbContext = db,
): void {
  context.delete(fundGroupAccounts).where(eq(fundGroupAccounts.fundGroupId, fundGroupId)).run();
  if (accountIds.length > 0) {
    context.insert(fundGroupAccounts).values(
      accountIds.map((accountId, sortOrder) => ({ fundGroupId, accountId, sortOrder })),
    ).run();
  }
}

export function replaceFundGroupPockets(
  fundGroupId: string,
  pocketIds: string[],
  context: DbContext = db,
): void {
  context.delete(fundGroupPockets).where(eq(fundGroupPockets.fundGroupId, fundGroupId)).run();
  if (pocketIds.length > 0) {
    context.insert(fundGroupPockets).values(
      pocketIds.map((pocketId, sortOrder) => ({ fundGroupId, pocketId, sortOrder })),
    ).run();
  }
}

export function newFundGroupRecordId(context: DbContext = db): string {
  return context.get<{ id: string }>(sql`SELECT lower(hex(randomblob(16))) AS id`)!.id;
}
