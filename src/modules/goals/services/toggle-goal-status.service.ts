import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findGoalById,
  updateGoalRecord,
} from "../repositories/goals.repository";
import type { Goal, GoalStatus } from "../types/goal.types";

export function toggleGoalStatus(
  id: string,
  newStatus: GoalStatus,
  context: DbContext = db,
): Goal {
  const existing = findGoalById(id, context);
  if (!existing) {
    throw new Error("Goal not found.");
  }

  updateGoalRecord(
    id,
    {
      status: newStatus,
      updatedAt: new Date(),
    },
    context,
  );

  const updated = findGoalById(id, context);
  if (!updated) {
    throw new Error("Failed to load updated goal.");
  }

  return updated;
}
