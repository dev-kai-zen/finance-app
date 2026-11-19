import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";
import { addDatabaseChangeListener } from "expo-sqlite";
import { initializeProStatus, subscribeToProStatus } from "@/modules/pro";
import { subscribeToCurrencyPreferences } from "@/modules/currencies";
import { updateDataWidgets } from "../services/widget-snapshot.service";

/**
 * Data tables that affect widget totals.
 * Explicitly excludes `settings` to prevent self-invalidation loops when saving snapshots.
 */
const SYNCED_TABLES = new Set([
  "transactions",
  "transaction_entries",
  "accounts",
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

    const cancelInitial = scheduleAfterInteractions(() => {
      void initializeProStatus().then(() => {
        void updateDataWidgets();
      });
    });

    // React immediately whenever Pro status changes (e.g. purchase, restore, dev simulation)
    const unsubscribePro = subscribeToProStatus(() => {
      void updateDataWidgets();
    });

    // React immediately whenever display currency or formatting preferences change
    const unsubscribeCurrency = subscribeToCurrencyPreferences(() => {
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
      cancelInitial();
      unsubscribePro();
      unsubscribeCurrency();
      subscription.remove();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return null;
}
