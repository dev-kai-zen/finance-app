import { db, type DbContext } from "@/infrastructure/database/client";
import {
  archiveSubscriptionRecord,
  findSubscriptionById,
  permanentlyDeleteSubscriptionRecord,
} from "../repositories/subscriptions.repository";
import { permanentlyDeleteScheduledTransaction } from "@/modules/scheduled-transactions";

export function archiveSubscription(subscriptionId: string): void {
  db.transaction((tx) => archiveSubscriptionInContext(subscriptionId, tx));
}

export function archiveSubscriptionInContext(
  subscriptionId: string,
  context: DbContext,
): void {
  const sub = findSubscriptionById(subscriptionId, context);
  if (sub?.scheduleId) {
    try {
      permanentlyDeleteScheduledTransaction(sub.scheduleId);
    } catch {
      // Ignore if already deleted
    }
  }
  archiveSubscriptionRecord(subscriptionId, context);
}

export function permanentlyDeleteSubscription(subscriptionId: string): void {
  db.transaction((tx) => permanentlyDeleteSubscriptionInContext(subscriptionId, tx));
}

export function permanentlyDeleteSubscriptionInContext(
  subscriptionId: string,
  context: DbContext,
): void {
  const sub = findSubscriptionById(subscriptionId, context);
  if (sub?.scheduleId) {
    try {
      permanentlyDeleteScheduledTransaction(sub.scheduleId);
    } catch {
      // Ignore if already deleted
    }
  }
  permanentlyDeleteSubscriptionRecord(subscriptionId, context);
}
