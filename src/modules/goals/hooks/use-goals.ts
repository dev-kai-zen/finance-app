import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { goalErrorMessage } from "../schemas/goal.schema";
import { deleteGoal as deleteGoalService } from "../services/delete-goal.service";
import { getGoalsWithProgress } from "../services/get-goals-with-progress.service";
import { saveGoal as saveGoalService } from "../services/save-goal.service";
import { toggleGoalStatus as toggleGoalStatusService } from "../services/toggle-goal-status.service";
import type {
  GoalInput,
  GoalStatus,
  GoalSummaryStats,
  GoalWithProgress,
} from "../types/goal.types";

export type GoalFilter = "all" | "in_progress" | "completed";

export function useGoals() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [summary, setSummary] = useState<GoalSummaryStats>({
    totalTargetMinorUnits: 0,
    totalSavedMinorUnits: 0,
    overallProgressPercentage: 0,
    activeGoalsCount: 0,
    completedGoalsCount: 0,
    totalGoalsCount: 0,
  });
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const data = getGoalsWithProgress();
      setGoals(data.goals);
      setSummary(data.summary);
      setError(null);
    } catch (cause) {
      setError(goalErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleSaveGoal = useCallback(
    (input: GoalInput, existingId?: string | null) => {
      try {
        saveGoalService(input, existingId);
        refresh();
        return true;
      } catch (cause) {
        setError(goalErrorMessage(cause));
        throw cause;
      }
    },
    [refresh],
  );

  const handleDeleteGoal = useCallback(
    (id: string) => {
      try {
        deleteGoalService(id);
        refresh();
      } catch (cause) {
        setError(goalErrorMessage(cause));
        throw cause;
      }
    },
    [refresh],
  );

  const handleToggleStatus = useCallback(
    (id: string, newStatus: GoalStatus) => {
      try {
        toggleGoalStatusService(id, newStatus);
        refresh();
      } catch (cause) {
        setError(goalErrorMessage(cause));
        throw cause;
      }
    },
    [refresh],
  );

  const filteredGoals = goals.filter((g) => {
    if (filter === "completed") {
      return g.isCompleted || g.status === "completed";
    }
    if (filter === "in_progress") {
      return !g.isCompleted && g.status === "in_progress";
    }
    return true;
  });

  return {
    goals,
    filteredGoals,
    summary,
    filter,
    setFilter,
    loading,
    error,
    refresh,
    saveGoal: handleSaveGoal,
    deleteGoal: handleDeleteGoal,
    toggleStatus: handleToggleStatus,
  };
}
