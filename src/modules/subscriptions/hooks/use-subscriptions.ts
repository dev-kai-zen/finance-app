import { useCallback, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { useFocusEffect } from "expo-router";

import { useLocalization } from "@/infrastructure/localization";
import { useCurrencyPreferences } from "@/modules/currencies";
import { listSubscriptions } from "../repositories/subscriptions.repository";
import { calculateBurnRateSummary } from "../services/calculate-burn-rate.service";
import {
  archiveSubscription,
  checkSubscriptionHasPayments,
  deleteOrArchiveSubscription,
  permanentlyDeleteSubscription,
  restoreSubscription,
  type RemoveSubscriptionResult,
} from "../services/delete-subscription.service";
import { recordSubscriptionPayment } from "../services/record-subscription-payment.service";
import { setSubscriptionStatus } from "../services/toggle-subscription-status.service";
import type {
  SubscriptionBurnRateSummary,
  SubscriptionFilter,
  SubscriptionItem,
  SubscriptionStatus,
} from "../types/subscription.types";

export function useSubscriptions(options?: { skipQuery?: boolean }) {
  const skipQuery = options?.skipQuery ?? false;
  const cancelPendingRef = useRef<(() => void) | null>(null);
  const isFocusedRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);
  const { preferences } = useCurrencyPreferences();
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [filter, setFilter] = useState<SubscriptionFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cancelScheduledRefresh = useCallback(() => {
    if (frameIdRef.current !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(frameIdRef.current);
      } else {
        clearTimeout(frameIdRef.current);
      }
      frameIdRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    cancelPendingRef.current?.();
    if (skipQuery) return;
    cancelPendingRef.current = runDeferredSyncQuery({ hasCachedResult: false, setLoading }, () => {
      try {
        const data = listSubscriptions({ includeArchived: true });
        setItems(data);
        setError(null);
      } catch (err) {
        console.warn("[useSubscriptions] Error reading subscriptions:", err);
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : "Failed to load subscriptions";
        setError(message);
      }
    });
  }, [skipQuery]);

  const scheduleRefresh = useCallback(() => {
    cancelScheduledRefresh();
    const schedule =
      typeof requestAnimationFrame !== "undefined"
        ? requestAnimationFrame
        : (cb: () => void) => setTimeout(cb, 0) as unknown as number;

    frameIdRef.current = schedule(() => {
      frameIdRef.current = null;
      if (isFocusedRef.current) {
        refresh();
      }
    });
  }, [cancelScheduledRefresh, refresh]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      if (skipQuery) {
        return () => {
          isFocusedRef.current = false;
          cancelPendingRef.current?.();
          cancelScheduledRefresh();
        };
      }

      refresh();

      const txSub = DeviceEventEmitter.addListener(
        "FINANCE_APP_TRANSACTION_MUTATED",
        () => {
          if (isFocusedRef.current) {
            scheduleRefresh();
          }
        },
      );

      const schedSub = DeviceEventEmitter.addListener(
        "FINANCE_APP_SCHEDULES_CHANGED",
        () => {
          if (isFocusedRef.current) {
            scheduleRefresh();
          }
        },
      );

      return () => {
        isFocusedRef.current = false;
        txSub.remove();
        schedSub.remove();
        cancelPendingRef.current?.();
        cancelScheduledRefresh();
      };
    }, [cancelScheduledRefresh, refresh, scheduleRefresh, skipQuery]),
  );

  const summary: SubscriptionBurnRateSummary = useMemo(() => {
    return calculateBurnRateSummary(
      items,
      preferences.defaultCurrency,
    );
  }, [items, preferences.defaultCurrency]);

  const filteredSubscriptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      // 1. Filter by status tab
      if (filter === "archived") {
        if (!item.archivedAt) return false;
      } else {
        // Active and non-archived tabs exclude archived subscriptions
        if (item.archivedAt) return false;
        if (filter === "active" && item.status !== "active") return false;
        if (filter === "trial" && item.status !== "trial") return false;
        if (filter === "paused" && item.status !== "paused") return false;
        if (filter === "cancelled" && item.status !== "cancelled") return false;
      }

      // 2. Filter by search query
      if (query.length > 0) {
        const nameMatch = item.name.toLowerCase().includes(query);
        const categoryMatch = item.categoryName?.toLowerCase().includes(query);
        const accountMatch = item.accountName?.toLowerCase().includes(query);
        if (!nameMatch && !categoryMatch && !accountMatch) {
          return false;
        }
      }

      return true;
    });
  }, [items, filter, searchQuery]);

  const markPaid = useCallback(
    (
      subscriptionId: string,
      options?: {
        accountId?: string;
        pocketId?: string | null;
        paidAt?: Date;
      },
    ) => {
      const result = recordSubscriptionPayment(subscriptionId, options);
      refresh();
      return result;
    },
    [refresh],
  );

  const changeStatus = useCallback(
    (subscriptionId: string, newStatus: SubscriptionStatus) => {
      setSubscriptionStatus(subscriptionId, newStatus);
      refresh();
    },
    [refresh],
  );

  const archive = useCallback(
    (subscriptionId: string) => {
      archiveSubscription(subscriptionId);
      refresh();
    },
    [refresh],
  );

  const restore = useCallback(
    (subscriptionId: string) => {
      restoreSubscription(subscriptionId);
      refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    (subscriptionId: string) => {
      permanentlyDeleteSubscription(subscriptionId);
      refresh();
    },
    [refresh],
  );

  const deleteOrArchive = useCallback(
    (subscriptionId: string): RemoveSubscriptionResult => {
      const result = deleteOrArchiveSubscription(subscriptionId);
      refresh();
      return result;
    },
    [refresh],
  );

  const checkHasPayments = useCallback((subscriptionId: string): boolean => {
    return checkSubscriptionHasPayments(subscriptionId);
  }, []);

  return {
    subscriptions: items,
    filteredSubscriptions,
    summary,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    refresh,
    markPaid,
    changeStatus,
    archive,
    restore,
    remove,
    deleteOrArchive,
    checkHasPayments,
  };
}
