import { asc, desc, eq, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  goalAccounts,
  goalPockets,
  goals,
  type GoalRecord,
  type NewGoalRecord,
} from "@/infrastructure/database/schema";
import type { Goal } from "../types/goal.types";

function mapGoalRecord(
  record: GoalRecord,
  accountIds: string[] = [],
  pocketIds: string[] = [],
): Goal {
  return {
    id: record.id,
    name: record.name,
    note: record.note,
    targetAmountMinorUnits: record.targetAmountMinorUnits,
    currencyCode: record.currencyCode,
    accountId: record.accountId,
    pocketId: record.pocketId,
    accountIds,
    pocketIds,
    targetDate: record.targetDate,
    iconKey: record.iconKey,
    hexColorsId: record.hexColorsId,
    status: record.status as Goal["status"],
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function listGoals(context: DbContext = db): Goal[] {
  const goalRows = context
    .select()
    .from(goals)
    .orderBy(asc(goals.sortOrder), desc(goals.createdAt))
    .all();

  const goalAccountRows = context.select().from(goalAccounts).all();
  const goalPocketRows = context.select().from(goalPockets).all();

  const accountIdsByGoalId = new Map<string, string[]>();
  for (const item of goalAccountRows) {
    const list = accountIdsByGoalId.get(item.goalId) ?? [];
    list.push(item.accountId);
    accountIdsByGoalId.set(item.goalId, list);
  }

  const pocketIdsByGoalId = new Map<string, string[]>();
  for (const item of goalPocketRows) {
    const list = pocketIdsByGoalId.get(item.goalId) ?? [];
    list.push(item.pocketId);
    pocketIdsByGoalId.set(item.goalId, list);
  }

  return goalRows.map((row) => {
    const linkedAccounts = accountIdsByGoalId.get(row.id) ?? [];
    if (row.accountId && !linkedAccounts.includes(row.accountId)) {
      linkedAccounts.push(row.accountId);
    }

    const linkedPockets = pocketIdsByGoalId.get(row.id) ?? [];
    if (row.pocketId && !linkedPockets.includes(row.pocketId)) {
      linkedPockets.push(row.pocketId);
    }

    return mapGoalRecord(row, linkedAccounts, linkedPockets);
  });
}

export function findGoalById(
  id: string,
  context: DbContext = db,
): Goal | null {
  const row = context
    .select()
    .from(goals)
    .where(eq(goals.id, id))
    .get();

  if (!row) return null;

  const linkedAccountRows = context
    .select()
    .from(goalAccounts)
    .where(eq(goalAccounts.goalId, id))
    .all();

  const accountIds = linkedAccountRows.map((item) => item.accountId);
  if (row.accountId && !accountIds.includes(row.accountId)) {
    accountIds.push(row.accountId);
  }

  const linkedPocketRows = context
    .select()
    .from(goalPockets)
    .where(eq(goalPockets.goalId, id))
    .all();

  const pocketIds = linkedPocketRows.map((item) => item.pocketId);
  if (row.pocketId && !pocketIds.includes(row.pocketId)) {
    pocketIds.push(row.pocketId);
  }

  return mapGoalRecord(row, accountIds, pocketIds);
}

export function insertGoal(
  record: NewGoalRecord,
  accountIds: string[] = [],
  pocketIds: string[] = [],
  context: DbContext = db,
): void {
  context.insert(goals).values(record).run();

  const uniqueAccountIds = Array.from(new Set(accountIds));
  for (const accountId of uniqueAccountIds) {
    context
      .insert(goalAccounts)
      .values({ goalId: record.id, accountId })
      .run();
  }

  const uniquePocketIds = Array.from(new Set(pocketIds));
  for (const pocketId of uniquePocketIds) {
    context
      .insert(goalPockets)
      .values({ goalId: record.id, pocketId })
      .run();
  }
}

export interface GoalLinksUpdate {
  accountIds?: string[];
  pocketIds?: string[];
}

export function updateGoalRecord(
  id: string,
  values: Partial<Omit<NewGoalRecord, "id" | "createdAt">>,
  linksOrAccountIdsOrContext?: GoalLinksUpdate | string[] | DbContext,
  maybeContext?: DbContext,
): void {
  let links: GoalLinksUpdate | undefined;
  let context: DbContext = db;

  if (Array.isArray(linksOrAccountIdsOrContext)) {
    links = { accountIds: linksOrAccountIdsOrContext };
    if (maybeContext) context = maybeContext;
  } else if (
    linksOrAccountIdsOrContext &&
    typeof linksOrAccountIdsOrContext === "object" &&
    ("accountIds" in linksOrAccountIdsOrContext || "pocketIds" in linksOrAccountIdsOrContext)
  ) {
    links = linksOrAccountIdsOrContext;
    if (maybeContext) context = maybeContext;
  } else if (linksOrAccountIdsOrContext && typeof linksOrAccountIdsOrContext === "object") {
    context = linksOrAccountIdsOrContext as DbContext;
  }

  context
    .update(goals)
    .set({
      ...values,
      updatedAt: values.updatedAt ?? new Date(),
    })
    .where(eq(goals.id, id))
    .run();

  if (links?.accountIds !== undefined) {
    context.delete(goalAccounts).where(eq(goalAccounts.goalId, id)).run();
    const uniqueAccountIds = Array.from(new Set(links.accountIds));
    for (const accountId of uniqueAccountIds) {
      context
        .insert(goalAccounts)
        .values({ goalId: id, accountId })
        .run();
    }
  }

  if (links?.pocketIds !== undefined) {
    context.delete(goalPockets).where(eq(goalPockets.goalId, id)).run();
    const uniquePocketIds = Array.from(new Set(links.pocketIds));
    for (const pocketId of uniquePocketIds) {
      context
        .insert(goalPockets)
        .values({ goalId: id, pocketId })
        .run();
    }
  }
}

export function deleteGoalRecord(
  id: string,
  context: DbContext = db,
): void {
  context.delete(goals).where(eq(goals.id, id)).run();
}

export function deleteAllGoals(context: DbContext = db): void {
  context.delete(goals).run();
}

export function newGoalRecordId(context: DbContext = db): string {
  const row = context.get<{ id: string }>(
    sql`SELECT lower(hex(randomblob(16))) AS id`,
  );
  return (
    row?.id ??
    `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );
}
