import { db, type DbContext } from "@/infrastructure/database/client";
import {
  deleteAllGoals,
  deleteGoalRecord,
} from "../repositories/goals.repository";

export function deleteGoal(id: string, context: DbContext = db): void {
  deleteGoalRecord(id, context);
}

export function clearGoalWorkspace(context: DbContext = db): void {
  deleteAllGoals(context);
}
