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
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        scheduleAfterInteractions(process);
      }
    });
    return () => {
      cancelInitial();
      subscription.remove();
    };
  }, []);

  return null;
}

