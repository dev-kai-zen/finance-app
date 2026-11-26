import { DeviceEventEmitter } from "react-native";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  archiveSubscriptionRecord,
  findSubscriptionById,
  getAllSubscriptionIds,
  hasSubscriptionPayments,
  permanentlyDeleteSubscriptionRecord,
  restoreSubscriptionRecord,
  updateSubscriptionRecord,
} from "../repositories/subscriptions.repository";
import {
  getScheduleBySubscriptionId,
  getScheduledTransaction,
  processDueSchedules,
  removeScheduledTransaction,
  restoreScheduledTransaction,
  unlinkScheduledTransactionSubscription,
} from "@/modules/scheduled-transactions";
import { syncSubscriptionScheduleInContext } from "./save-subscription.service";

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
      const sched = getScheduledTransaction(schedId, context);
      if (sched) {
        removeScheduledTransaction(schedId, context);
      }
    }
  }
  archiveSubscriptionRecord(subscriptionId, context);
}

export function restoreSubscription(subscriptionId: string): void {
  db.transaction((tx) => restoreSubscriptionInContext(subscriptionId, tx));
  try {
    DeviceEventEmitter.emit("FINANCE_APP_SCHEDULE_CATCH_UP_REQUESTED");
  } catch {
    // Ignore if processing encounters an issue
  }
}

export function restoreSubscriptionInContext(
  subscriptionId: string,
  context: DbContext,
): void {
  const sub = findSubscriptionById(subscriptionId, context);
  if (sub) {
    const linkedScheduleId = syncSubscriptionScheduleInContext(sub, context);
    const targetScheduleId = linkedScheduleId ?? resolveScheduleId(sub, context);
    if (targetScheduleId) {
      const sched = getScheduledTransaction(targetScheduleId, context);
      if (sched && (sched.archivedAt !== null || sched.nextNominalAt === null)) {
        const targetStatus: "active" | "paused" =
          sub.status === "paused" || sub.status === "cancelled"
            ? "paused"
            : "active";
        restoreScheduledTransaction(
          targetScheduleId,
          { status: targetStatus },
          context,
        );
      }
    }
    if (linkedScheduleId && linkedScheduleId !== sub.scheduleId) {
      updateSubscriptionRecord(
        subscriptionId,
        { scheduleId: linkedScheduleId, updatedAt: new Date() },
        context,
      );
    }
  }
  restoreSubscriptionRecord(subscriptionId, context);
}

export function permanentlyDeleteSubscription(subscriptionId: string): void {
  db.transaction((tx) => permanentlyDeleteSubscriptionInContext(subscriptionId, tx));
}

export function getExistingSubscriptionIdSet(
  context: DbContext = db,
): Set<string> {
  return new Set(getAllSubscriptionIds(context));
}

export function permanentlyDeleteSubscriptionInContext(
  subscriptionId: string,
  context: DbContext,
): void {
  const sub = findSubscriptionById(subscriptionId, context);
  if (sub) {
    const schedId = resolveScheduleId(sub, context);
    if (schedId) {
      const sched = getScheduledTransaction(schedId, context);
      if (sched) {
        const res = removeScheduledTransaction(schedId, context);
        if (res === "archived") {
          unlinkScheduledTransactionSubscription(schedId, context);
        }
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
