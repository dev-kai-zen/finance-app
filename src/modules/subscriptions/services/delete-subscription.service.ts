import { db, type DbContext } from "@/infrastructure/database/client";
import {
  archiveSubscriptionRecord,
  findSubscriptionById,
  hasSubscriptionPayments,
  permanentlyDeleteSubscriptionRecord,
  restoreSubscriptionRecord,
} from "../repositories/subscriptions.repository";
import {
  removeScheduledTransaction,
  restoreScheduledTransaction,
} from "@/modules/scheduled-transactions";

export type RemoveSubscriptionResult = "deleted" | "archived";

export function checkSubscriptionHasPayments(subscriptionId: string): boolean {
  return hasSubscriptionPayments(subscriptionId, db);
}

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
      removeScheduledTransaction(sub.scheduleId);
    } catch {
      // Ignore if schedule record was not found
    }
  }
  archiveSubscriptionRecord(subscriptionId, context);
}

export function restoreSubscription(subscriptionId: string): void {
  db.transaction((tx) => restoreSubscriptionInContext(subscriptionId, tx));
}

export function restoreSubscriptionInContext(
  subscriptionId: string,
  context: DbContext,
): void {
  const sub = findSubscriptionById(subscriptionId, context);
  if (sub?.scheduleId) {
    try {
      restoreScheduledTransaction(sub.scheduleId, {
        status: sub.status === "paused" ? "paused" : "active",
        nextNominalAt: sub.nextRenewalDate,
        nextEffectiveAt: sub.nextRenewalDate,
      });
    } catch {
      // Ignore if schedule record was not found
    }
  }
  restoreSubscriptionRecord(subscriptionId, context);
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
      removeScheduledTransaction(sub.scheduleId);
    } catch {
      // Ignore if already deleted
    }
  }
  permanentlyDeleteSubscriptionRecord(subscriptionId, context);
}

export function deleteOrArchiveSubscription(
  subscriptionId: string,
): RemoveSubscriptionResult {
  return db.transaction((tx) => deleteOrArchiveSubscriptionInContext(subscriptionId, tx));
}

export function deleteOrArchiveSubscriptionInContext(
  subscriptionId: string,
  context: DbContext,
): RemoveSubscriptionResult {
  const sub = findSubscriptionById(subscriptionId, context);
  if (!sub) return "deleted";

  const hasPayments = hasSubscriptionPayments(subscriptionId, context);
  if (hasPayments) {
    archiveSubscriptionInContext(subscriptionId, context);
    return "archived";
  } else {
    permanentlyDeleteSubscriptionInContext(subscriptionId, context);
    return "deleted";
  }
}
