import { DeviceEventEmitter } from "react-native";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findSubscriptionById,
  updateSubscriptionRecord,
} from "../repositories/subscriptions.repository";
import type { SubscriptionStatus } from "../types/subscription.types";
import {
  getScheduleBySubscriptionId,
  processDueSchedules,
  setScheduledTransactionPaused,
} from "@/modules/scheduled-transactions";

export function setSubscriptionStatus(
  subscriptionId: string,
  newStatus: SubscriptionStatus,
): void {
  db.transaction((tx) => setSubscriptionStatusInContext(subscriptionId, newStatus, tx));
  if (newStatus === "active" || newStatus === "trial") {
    try {
      DeviceEventEmitter.emit("FINANCE_APP_SCHEDULE_CATCH_UP_REQUESTED");
    } catch {
      // Ignore
    }
  }
}

export function setSubscriptionStatusInContext(
  subscriptionId: string,
  newStatus: SubscriptionStatus,
  context: DbContext,
): void {
  const sub = findSubscriptionById(subscriptionId, context);
  if (!sub) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const scheduleId = sub.scheduleId ?? getScheduleBySubscriptionId(subscriptionId, context)?.id;
  if (scheduleId) {
    try {
      const isPaused = newStatus === "paused" || newStatus === "cancelled";
      setScheduledTransactionPaused(scheduleId, isPaused, context);
    } catch {
      // Ignore if schedule record was not found
    }
  }

  const now = new Date();
  updateSubscriptionRecord(
    subscriptionId,
    {
      status: newStatus,
      cancelledAt: newStatus === "cancelled" ? now : null,
      updatedAt: now,
    },
    context,
  );
}
