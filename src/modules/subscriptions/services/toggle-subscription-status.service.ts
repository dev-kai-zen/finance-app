import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findSubscriptionById,
  updateSubscriptionRecord,
} from "../repositories/subscriptions.repository";
import type { SubscriptionStatus } from "../types/subscription.types";

export function setSubscriptionStatus(
  subscriptionId: string,
  newStatus: SubscriptionStatus,
): void {
  db.transaction((tx) => setSubscriptionStatusInContext(subscriptionId, newStatus, tx));
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
