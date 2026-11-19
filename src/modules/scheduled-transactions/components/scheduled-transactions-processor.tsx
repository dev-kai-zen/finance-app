import { useEffect } from "react";
import { AppState } from "react-native";

import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";
import { processDueSchedules } from "../services/process-due-schedules.service";
import { reconcileOrphanedSubscriptionSchedules } from "../services/reconcile-orphaned-schedules.service";

export function ScheduledTransactionsProcessor() {
  useEffect(() => {
    const process = () => {
      try {
        reconcileOrphanedSubscriptionSchedules();
        processDueSchedules();
      } catch (error) {
        console.error(
          "[ScheduledTransactions] Unable to process due schedules:",
          error,
        );
      }
    };

    const cancelInitial = scheduleAfterInteractions(process);
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelResumeSchedule: (() => void) | null = null;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          cancelResumeSchedule = scheduleAfterInteractions(process);
        }, 1000);
      } else {
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
        if (cancelResumeSchedule) {
          cancelResumeSchedule();
          cancelResumeSchedule = null;
        }
      }
    });
    return () => {
      cancelInitial();
      if (resumeTimer) clearTimeout(resumeTimer);
      if (cancelResumeSchedule) cancelResumeSchedule();
      subscription.remove();
    };
  }, []);

  return null;
}

