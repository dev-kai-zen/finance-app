import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";

import { triggerTransactionAttachmentSync } from "../services/transaction-attachments.service";

const SYNC_INTERVAL_MS = 60_000;

export function TransactionAttachmentsSyncProcessor() {
  useEffect(() => {
    const runWhenOnline = () => {
      void NetInfo.fetch().then((state) => {
        if (state.isConnected) triggerTransactionAttachmentSync();
      });
    };

    const cancelInitial = scheduleAfterInteractions(runWhenOnline);
    const interval = setInterval(runWhenOnline, SYNC_INTERVAL_MS);
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected) triggerTransactionAttachmentSync();
    });
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelResumeSchedule: (() => void) | null = null;

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          if (resumeTimer) clearTimeout(resumeTimer);
          resumeTimer = setTimeout(() => {
            cancelResumeSchedule = scheduleAfterInteractions(runWhenOnline);
          }, 2000);
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
      },
    );

    return () => {
      cancelInitial();
      clearInterval(interval);
      if (resumeTimer) clearTimeout(resumeTimer);
      if (cancelResumeSchedule) cancelResumeSchedule();
      networkSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
