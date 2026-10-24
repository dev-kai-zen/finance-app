import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  addDatabaseChangeListener,
  type DatabaseChangeEvent,
} from "expo-sqlite";

import { QUICK_SYNC_WATCHED_TABLE_NAME_SET } from "@/infrastructure/database/user-data-tables";
import {
  flushDebouncedQuickSync,
  queueDebouncedQuickSync,
} from "@/infrastructure/sync";

import { getQuickSyncConfig } from "../repositories/quick-sync-settings.repository";
import { triggerQuickSync } from "../services/quick-sync.service";

function shouldQueueQuickSyncForDatabaseChange(
  event: DatabaseChangeEvent,
): boolean {
  return QUICK_SYNC_WATCHED_TABLE_NAME_SET.has(event.tableName);
}

export function QuickSyncProcessor() {
  useEffect(() => {
    const dbSubscription = addDatabaseChangeListener((event) => {
      if (!shouldQueueQuickSyncForDatabaseChange(event)) {
        return;
      }

      queueDebouncedQuickSync();
    });

    const netInfoSubscription = NetInfo.addEventListener((netState) => {
      if (netState.isConnected) {
        const config = getQuickSyncConfig();
        if (config.enabled) {
          if (
            config.network === "any" ||
            netState.type === "wifi" ||
            netState.type === "ethernet"
          ) {
            void triggerQuickSync();
          }
        }
      }
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "background" || nextState === "inactive") {
          flushDebouncedQuickSync();
        } else if (nextState === "active") {
          const config = getQuickSyncConfig();
          if (config.enabled) {
            void triggerQuickSync();
          }
        }
      },
    );

    return () => {
      dbSubscription.remove();
      netInfoSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
