import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { addDatabaseChangeListener } from "expo-sqlite";
import { initializeProStatus, subscribeToProStatus } from "@/modules/pro";
import { updateDataWidgets } from "../services/widget-snapshot.service";

/** Subset of `USER_DATA_TABLE_NAMES` in `@/infrastructure/database/user-data-tables`. */
const SYNCED_TABLES = new Set([
  "transactions",
  "transaction_entries",
  "accounts",
  "settings",
  "categories",
  "category_budgets",
  "exchange_rates",
]);

/**
 * Headless processor that listens for local database mutations and keeps
 * the Android home screen financial widgets (Cashflow & Net Worth) in sync.
 */
export function WidgetSyncProcessor(): null {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    // Trigger an initial refresh on app startup once Pro status is initialized
    void initializeProStatus().then(() => {
      void updateDataWidgets();
    });

    // React immediately whenever Pro status changes (e.g. purchase, restore, dev simulation)
    const unsubscribePro = subscribeToProStatus(() => {
      void updateDataWidgets();
    });

    const subscription = addDatabaseChangeListener((event) => {
      if (!SYNCED_TABLES.has(event.tableName)) {
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void updateDataWidgets();
      }, 1000);
    });

    return () => {
      unsubscribePro();
      subscription.remove();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return null;
}
