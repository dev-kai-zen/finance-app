import { useEffect } from "react";
import { AppState, DeviceEventEmitter } from "react-native";

import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";
import { processDueSchedulesAsync, setScheduleProcessingSuspended } from "../services/process-due-schedules.service";
import { reconcileOrphanedSubscriptionSchedules } from "../services/reconcile-orphaned-schedules.service";

export function ScheduledTransactionsProcessor() {
  useEffect(() => {
    setScheduleProcessingSuspended(false);
    let cancelled = false;
    let maintenanceDone = false;
    const process = async () => {
      if (cancelled) return;
      try {
        if (!maintenanceDone) { reconcileOrphanedSubscriptionSchedules(); maintenanceDone = true; }
        await processDueSchedulesAsync(new Date(), { isCancelled: () => cancelled });
        // A resume may have joined a previous worker that was already cancelling.
        if (!cancelled) await processDueSchedulesAsync(new Date(), { isCancelled: () => cancelled });
      } catch (error) {
        console.error(
          "[ScheduledTransactions] Unable to process due schedules:",
          error,
        );
      }
    };

    const requested = DeviceEventEmitter.addListener("FINANCE_APP_SCHEDULE_CATCH_UP_REQUESTED", () => { void process(); });
    const cancelInitial = scheduleAfterInteractions(process);
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelResumeSchedule: (() => void) | null = null;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        cancelled = false;
        setScheduleProcessingSuspended(false);
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          cancelResumeSchedule = scheduleAfterInteractions(process);
        }, 1000);
      } else {
        cancelled = true;
        setScheduleProcessingSuspended(true);
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
      cancelled = true;
      setScheduleProcessingSuspended(true);
      cancelInitial();
      if (resumeTimer) clearTimeout(resumeTimer);
      if (cancelResumeSchedule) cancelResumeSchedule();
      subscription.remove();
      requested.remove();
    };
  }, []);

  return null;
}

