import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import {
  getQuickSyncConfig,
  subscribeToQuickSyncSettings,
} from "@/infrastructure/sync";
import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";

import { triggerTransactionAttachmentSync } from "../services/transaction-attachments.service";

const SYNC_INTERVAL_MS = 60_000;

export function TransactionAttachmentsSyncProcessor() {
  useEffect(() => {
    const runWhenOnline = () => {
      const config = getQuickSyncConfig();
      if (!config.enabled || !config.syncAttachments) return;
      void NetInfo.fetch().then((state) => {
        if (state.isConnected) triggerTransactionAttachmentSync();
      });
    };

    const cancelInitial = scheduleAfterInteractions(runWhenOnline);
    const interval = setInterval(runWhenOnline, SYNC_INTERVAL_MS);
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected) runWhenOnline();
    });
    const settingsSubscription = subscribeToQuickSyncSettings(() => {
      const config = getQuickSyncConfig();
      if (config.enabled && config.syncAttachments) {
        runWhenOnline();
      }
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
      settingsSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
