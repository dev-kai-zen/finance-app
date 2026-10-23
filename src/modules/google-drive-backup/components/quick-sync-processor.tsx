import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  addDatabaseChangeListener,
  type DatabaseChangeEvent,
} from "expo-sqlite";

import { QUICK_SYNC_WATCHED_TABLE_NAME_SET } from "@/infrastructure/database/user-data-tables";

import { getQuickSyncConfig } from "../repositories/quick-sync-settings.repository";
import { triggerQuickSync } from "../services/quick-sync.service";

const DEBOUNCE_DELAY_MS = 3000;

function shouldQueueQuickSyncForDatabaseChange(
  event: DatabaseChangeEvent,
): boolean {
  return QUICK_SYNC_WATCHED_TABLE_NAME_SET.has(event.tableName);
}

export function QuickSyncProcessor() {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const runDebouncedSyncIfDue = () => {
      const config = getQuickSyncConfig();
      if (!config.enabled) {
        return;
      }

      void triggerQuickSync().catch(() => {
        // Errors are broadcast through QuickSyncState
      });
    };

    const queueDebouncedSync = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        runDebouncedSyncIfDue();
      }, DEBOUNCE_DELAY_MS);
    };

    const flushPendingSyncImmediately = () => {
      if (!debounceTimerRef.current) {
        return;
      }

      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      runDebouncedSyncIfDue();
    };

    const dbSubscription = addDatabaseChangeListener((event) => {
      if (!shouldQueueQuickSyncForDatabaseChange(event)) {
        return;
      }

      queueDebouncedSync();
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
          flushPendingSyncImmediately();
        } else if (nextState === "active") {
          const config = getQuickSyncConfig();
          if (config.enabled) {
            void triggerQuickSync();
          }
        }
      },
    );

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      dbSubscription.remove();
      netInfoSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
