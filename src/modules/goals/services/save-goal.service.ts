import { db, type DbContext } from "@/infrastructure/database/client";
import type { NewGoalRecord } from "@/infrastructure/database/schema";
import {
  findGoalById,
  insertGoal,
  newGoalRecordId,
  updateGoalRecord,
} from "../repositories/goals.repository";
import { goalInputSchema } from "../schemas/goal.schema";
import type { Goal, GoalInput } from "../types/goal.types";

export function saveGoal(
  input: GoalInput,
  existingId?: string | null,
  context: DbContext = db,
): Goal {
  const validated = goalInputSchema.parse(input);
  const now = new Date();

  const accountIds =
    validated.accountIds && validated.accountIds.length > 0
      ? validated.accountIds
      : validated.accountId
        ? [validated.accountId]
        : [];
  const primaryAccountId = accountIds[0] ?? null;

  const pocketIds =
    validated.pocketIds && validated.pocketIds.length > 0
      ? validated.pocketIds
      : validated.pocketId
        ? [validated.pocketId]
        : [];
  const primaryPocketId = pocketIds[0] ?? null;

  if (existingId) {
    const existing = findGoalById(existingId, context);
    if (!existing) {
      throw new Error("Goal not found.");
    }

    updateGoalRecord(
      existingId,
      {
        name: validated.name,
        note: validated.note ?? null,
        targetAmountMinorUnits: validated.targetAmountMinorUnits,
        currencyCode: validated.currencyCode,
        accountId: primaryAccountId,
        pocketId: primaryPocketId,
        targetDate: validated.targetDate ?? null,
        iconKey: validated.iconKey ?? null,
        hexColorsId: validated.hexColorsId ?? null,
        status: validated.status,
        sortOrder: validated.sortOrder ?? existing.sortOrder,
        updatedAt: now,
      },
      { accountIds, pocketIds },
      context,
    );

    const updated = findGoalById(existingId, context);
    if (!updated) {
      throw new Error("Failed to load updated goal.");
    }
    return updated;
  }

  const id = newGoalRecordId(context);
  const record: NewGoalRecord = {
    id,
    name: validated.name,
    note: validated.note ?? null,
    targetAmountMinorUnits: validated.targetAmountMinorUnits,
    currencyCode: validated.currencyCode,
    accountId: primaryAccountId,
    pocketId: primaryPocketId,
    targetDate: validated.targetDate ?? null,
    iconKey: validated.iconKey ?? null,
    hexColorsId: validated.hexColorsId ?? null,
    status: validated.status ?? "in_progress",
    sortOrder: validated.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  insertGoal(record, accountIds, pocketIds, context);

  const created = findGoalById(id, context);
  if (!created) {
    throw new Error("Failed to load created goal.");
  }
  return created;
}
