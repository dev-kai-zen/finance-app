import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, DeviceEventEmitter } from "react-native";
import { useFocusEffect } from "expo-router";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
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

export function useGoals(options?: { skipQuery?: boolean }) {
  const skipQuery = options?.skipQuery ?? false;
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [summary, setSummary] = useState<GoalSummaryStats>({
    currencyCode: "PHP",
    totalTargetMinorUnits: 0,
    totalSavedMinorUnits: 0,
    totalRemainingMinorUnits: 0,
    overallProgressPercentage: 0,
    activeGoalsCount: 0,
    completedGoalsCount: 0,
    totalGoalsCount: 0,
  });
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const isFocusedRef = useRef(false);
  const requestIdRef = useRef(0);
  const frameIdRef = useRef<number | null>(null);
  const lastEvaluatedDateRef = useRef<string>(new Date().toDateString());
  const cancelPendingRef = useRef<(() => void) | null>(null);

  const cancelPending = useCallback(() => {
    ++requestIdRef.current;
    if (cancelPendingRef.current) {
      cancelPendingRef.current();
      cancelPendingRef.current = null;
    }
    setIsPending(false);
  }, []);

  const cancelScheduledRefresh = useCallback(() => {
    if (frameIdRef.current !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(frameIdRef.current);
      } else {
        clearTimeout(frameIdRef.current);
      }
      frameIdRef.current = null;
    }
  }, []);

  const refresh = useCallback((): Promise<void> => {
    cancelPending();
    if (skipQuery) return Promise.resolve();

    const currentRequestId = requestIdRef.current;
    setIsPending(true);

    return new Promise<void>((resolve) => {
      const cancelQuery = runDeferredSyncQuery(
        {
          hasCachedResult: hasLoadedOnceRef.current,
          setLoading,
          onMarkLoaded: () => {
            hasLoadedOnceRef.current = true;
          },
        },
        () => {
          if (currentRequestId !== requestIdRef.current) {
            resolve();
            return;
          }
          cancelPendingRef.current = null;
          try {
            const data = getGoalsWithProgress();
            setGoals(data.goals);
            setSummary(data.summary);
            setError(null);
          } catch (cause) {
            setError(goalErrorMessage(cause));
          } finally {
            setIsPending(false);
            resolve();
          }
        },
      );

      cancelPendingRef.current = () => {
        cancelQuery();
        setIsPending(false);
        resolve();
      };
    });
  }, [cancelPending, skipQuery]);

  const scheduleRefresh = useCallback(() => {
    cancelScheduledRefresh();
    const schedule =
      typeof requestAnimationFrame !== "undefined"
        ? requestAnimationFrame
        : (cb: () => void) => setTimeout(cb, 0) as unknown as number;

    frameIdRef.current = schedule(() => {
      frameIdRef.current = null;
      if (isFocusedRef.current) {
        void refresh();
      }
    });
  }, [cancelScheduledRefresh, refresh]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      lastEvaluatedDateRef.current = new Date().toDateString();

      if (skipQuery) {
        return () => {
          isFocusedRef.current = false;
          cancelPending();
          cancelScheduledRefresh();
        };
      }

      scheduleRefresh();

      const txSub = DeviceEventEmitter.addListener(
        "FINANCE_APP_TRANSACTION_MUTATED",
        () => {
          if (isFocusedRef.current) {
            scheduleRefresh();
          }
        },
      );

      const schedSub = DeviceEventEmitter.addListener(
        "FINANCE_APP_SCHEDULES_CHANGED",
        () => {
          if (isFocusedRef.current) {
            scheduleRefresh();
          }
        },
      );

      const appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active" && isFocusedRef.current) {
          const today = new Date().toDateString();
          if (today !== lastEvaluatedDateRef.current) {
            lastEvaluatedDateRef.current = today;
            scheduleRefresh();
          }
        }
      });

      return () => {
        isFocusedRef.current = false;
        txSub.remove();
        schedSub.remove();
        appStateSub.remove();
        cancelPending();
        cancelScheduledRefresh();
      };
    }, [cancelPending, cancelScheduledRefresh, refresh, scheduleRefresh, skipQuery]),
  );

  useEffect(() => {
    return subscribeToDatabaseReplacement(() => {
      if (isFocusedRef.current) {
        scheduleRefresh();
      }
    });
  }, [scheduleRefresh]);

  const handleSaveGoal = useCallback(
    async (input: GoalInput, existingId?: string | null) => {
      try {
        saveGoalService(input, existingId);
        await refresh();
        return true;
      } catch (cause) {
        setError(goalErrorMessage(cause));
        throw cause;
      }
    },
    [refresh],
  );

  const handleDeleteGoal = useCallback(
    async (id: string) => {
      try {
        deleteGoalService(id);
        await refresh();
      } catch (cause) {
        setError(goalErrorMessage(cause));
        throw cause;
      }
    },
    [refresh],
  );

  const handleToggleStatus = useCallback(
    async (id: string, newStatus: GoalStatus) => {
      try {
        toggleGoalStatusService(id, newStatus);
        await refresh();
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    goals,
    filteredGoals,
    summary,
    filter,
    setFilter,
    loading,
    isPending,
    error,
    clearError,
    refresh,
    saveGoal: handleSaveGoal,
    deleteGoal: handleDeleteGoal,
    toggleStatus: handleToggleStatus,
  };
}
