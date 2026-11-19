import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  addDatabaseChangeListener,
  type DatabaseChangeEvent,
} from "expo-sqlite";

import {
  isDatabaseReplacing,
  QUICK_SYNC_WATCHED_TABLE_NAME_SET,
} from "@/infrastructure/database";
import {
  flushDebouncedQuickSync,
  queueDebouncedQuickSync,
} from "@/infrastructure/sync";

import { getQuickSyncConfig } from "../repositories/quick-sync-settings.repository";
import { triggerQuickSync } from "../services/quick-sync.service";

function shouldQueueQuickSyncForDatabaseChange(
  event: DatabaseChangeEvent,
): boolean {
  if (isDatabaseReplacing()) {
    return false;
  }
  return QUICK_SYNC_WATCHED_TABLE_NAME_SET.has(event.tableName);
}

const QUICK_SYNC_RESUME_DELAY_MS = 1500;

export function QuickSyncProcessor() {
  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let latestNetState: { isConnected: boolean | null; type: string } | null =
      null;

    const clearPendingResumeTimer = () => {
      if (resumeTimer !== null) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
    };

    const scheduleDeferredSyncCheck = (requireNetworkMatch: boolean) => {
      clearPendingResumeTimer();
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        const config = getQuickSyncConfig();
        if (!config.enabled) {
          return;
        }
        if (requireNetworkMatch && latestNetState) {
          if (
            !latestNetState.isConnected ||
            (config.network !== "any" &&
              latestNetState.type !== "wifi" &&
              latestNetState.type !== "ethernet")
          ) {
            return;
          }
        }
        void triggerQuickSync({ config });
      }, QUICK_SYNC_RESUME_DELAY_MS);
    };

    const dbSubscription = addDatabaseChangeListener((event) => {
      if (!shouldQueueQuickSyncForDatabaseChange(event)) {
        return;
      }

      queueDebouncedQuickSync();
    });

    const netInfoSubscription = NetInfo.addEventListener((netState) => {
      latestNetState = {
        isConnected: netState.isConnected,
        type: netState.type,
      };
      if (netState.isConnected) {
        scheduleDeferredSyncCheck(true);
      }
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "background" || nextState === "inactive") {
          clearPendingResumeTimer();
          flushDebouncedQuickSync();
        } else if (nextState === "active") {
          scheduleDeferredSyncCheck(false);
        }
      },
    );

    return () => {
      clearPendingResumeTimer();
      dbSubscription.remove();
      netInfoSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
