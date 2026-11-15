import { useEffect } from "react";
import { AppState } from "react-native";

import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";
import { processDueSchedules } from "../services/process-due-schedules.service";

export function ScheduledTransactionsProcessor() {
  useEffect(() => {
    const process = () => {
      try {
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

