import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useLocalization } from "@/infrastructure/localization";
import { listSubscriptions } from "../repositories/subscriptions.repository";
import { calculateBurnRateSummary } from "../services/calculate-burn-rate.service";
import { archiveSubscription, permanentlyDeleteSubscription } from "../services/delete-subscription.service";
import { recordSubscriptionPayment } from "../services/record-subscription-payment.service";
import { setSubscriptionStatus } from "../services/toggle-subscription-status.service";
import type {
  SubscriptionBurnRateSummary,
  SubscriptionFilter,
  SubscriptionItem,
  SubscriptionStatus,
} from "../types/subscription.types";

export function useSubscriptions() {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [filter, setFilter] = useState<SubscriptionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    try {
      const data = listSubscriptions();
      setItems(data);
    } catch (err) {
      console.warn("[useSubscriptions] Error reading subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const summary: SubscriptionBurnRateSummary = useMemo(() => {
    return calculateBurnRateSummary(items);
  }, [items]);

  const filteredSubscriptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      // 1. Filter by status tab
      if (filter === "active" && item.status !== "active") return false;
      if (filter === "trial" && item.status !== "trial") return false;
      if (filter === "paused" && item.status !== "paused") return false;
      if (filter === "cancelled" && item.status !== "cancelled") return false;

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

  const remove = useCallback(
    (subscriptionId: string) => {
      permanentlyDeleteSubscription(subscriptionId);
      refresh();
    },
    [refresh],
  );

  return {
    subscriptions: items,
    filteredSubscriptions,
    summary,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    loading,
    refresh,
    markPaid,
    changeStatus,
    archive,
    remove,
  };
}
