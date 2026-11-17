import { db, type DbContext } from "@/infrastructure/database/client";
import {
  archiveSubscriptionRecord,
  findSubscriptionById,
  hasSubscriptionPayments,
  permanentlyDeleteSubscriptionRecord,
  restoreSubscriptionRecord,
} from "../repositories/subscriptions.repository";
import {
  getScheduleBySubscriptionId,
  removeScheduledTransaction,
  restoreScheduledTransaction,
} from "@/modules/scheduled-transactions";

export type RemoveSubscriptionResult = "deleted" | "archived";

function resolveScheduleId(
  sub: { id: string; scheduleId: string | null },
  context: DbContext,
): string | null {
  if (sub.scheduleId) return sub.scheduleId;
  const linked = getScheduleBySubscriptionId(sub.id, context);
  return linked?.id || null;
}

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
  if (sub) {
    const schedId = resolveScheduleId(sub, context);
    if (schedId) {
      try {
        removeScheduledTransaction(schedId, context);
      } catch (err) {
        console.warn("[archiveSubscriptionInContext] Failed to remove schedule:", err);
      }
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
  if (sub) {
    const schedId = resolveScheduleId(sub, context);
    if (schedId) {
      try {
        restoreScheduledTransaction(
          schedId,
          {
            status: sub.status === "paused" ? "paused" : "active",
            nextNominalAt: sub.nextRenewalDate,
            nextEffectiveAt: sub.nextRenewalDate,
          },
          context,
        );
      } catch (err) {
        console.warn("[restoreSubscriptionInContext] Failed to restore schedule:", err);
      }
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
  if (sub) {
    const schedId = resolveScheduleId(sub, context);
    if (schedId) {
      try {
        removeScheduledTransaction(schedId, context);
      } catch (err) {
        console.warn("[permanentlyDeleteSubscriptionInContext] Failed to remove schedule:", err);
      }
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
