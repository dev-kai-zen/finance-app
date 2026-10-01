import { useEffect } from "react";
import { AppState } from "react-native";

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

    process();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") process();
    });
    return () => subscription.remove();
  }, []);

  return null;
}

