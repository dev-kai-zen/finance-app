import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as SQLite from "expo-sqlite";

import { getQuickSyncConfig } from "../repositories/quick-sync-settings.repository";
import { triggerQuickSync } from "../services/quick-sync.service";

const WATCHED_TABLES = new Set([
  "accounts",
  "account_types",
  "budgets",
  "categories",
  "credit_card_billing",
  "credit_card_details",
  "currencies",
  "exchange_rates",
  "fund_groups",
  "fund_group_accounts",
  "fund_group_pockets",
  "goals",
  "hex_colors",
  "labels",
  "notes",
  "note_attachments",
  "pockets",
  "transactions",
  "transaction_attachments",
  "transaction_entries",
  "transaction_labels",
  "transaction_presets",
  "transaction_schedules",
  "transaction_schedule_occurrences",
  "transaction_schedule_postings",
]);

const DEBOUNCE_DELAY_MS = 3000;

export function QuickSyncProcessor() {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const queueDebouncedSync = () => {
      const config = getQuickSyncConfig();
      if (!config.enabled) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void triggerQuickSync().catch(() => {
          // Errors are broadcast through QuickSyncState
        });
      }, DEBOUNCE_DELAY_MS);
    };

    const flushPendingSyncImmediately = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        void triggerQuickSync();
      }
    };

    // 1. Listen for SQLite table mutations
    let dbSubscription: { remove: () => void } | null = null;
    try {
      dbSubscription = SQLite.addDatabaseChangeListener((event) => {
        if (WATCHED_TABLES.has(event.tableName)) {
          queueDebouncedSync();
        }
      });
    } catch {
      // In web or mock environments where addDatabaseChangeListener is unsupported
    }

    // 2. Listen for network changes (e.g. device reconnects to Wi-Fi)
    const netInfoSubscription = NetInfo.addEventListener((netState) => {
      if (netState.isConnected) {
        const config = getQuickSyncConfig();
        if (config.enabled) {
          // If on wifi or network is set to any, trigger sync
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

    // 3. Listen for app state transitions
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
      dbSubscription?.remove();
      netInfoSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
