import { db, type DbContext } from "@/infrastructure/database/client";
import { getExistingSubscriptionIdSet } from "@/modules/subscriptions";
import {
  deleteScheduledTransactionRecord,
  deleteUnprocessedScheduleOccurrences,
  findSchedulesWithSubscription,
  hasSchedulePostings,
  updateScheduledTransactionRecord,
} from "../repositories/scheduled-transactions.repository";

export interface ReconcileOrphanedSchedulesResult {
  deletedCount: number;
  unlinkedCount: number;
}

export function reconcileOrphanedSubscriptionSchedulesInContext(
  context: DbContext,
): ReconcileOrphanedSchedulesResult {
  const subSchedules = findSchedulesWithSubscription(context);
  if (subSchedules.length === 0) {
    return { deletedCount: 0, unlinkedCount: 0 };
  }

  const existingSubIds = getExistingSubscriptionIdSet(context);
  const orphans = subSchedules.filter(
    (s) => s.subscriptionId && !existingSubIds.has(s.subscriptionId),
  );

  if (orphans.length === 0) {
    return { deletedCount: 0, unlinkedCount: 0 };
  }

  let deletedCount = 0;
  let unlinkedCount = 0;
  const now = new Date();

  for (const orphan of orphans) {
    const hasPostings = hasSchedulePostings(orphan.id, context);
    deleteUnprocessedScheduleOccurrences(orphan.id, context);

    if (!hasPostings) {
      deleteScheduledTransactionRecord(orphan.id, context);
      deletedCount++;
    } else {
      updateScheduledTransactionRecord(
        orphan.id,
        {
          subscriptionId: null,
          status: "completed",
          archivedAt: orphan.archivedAt ?? now,
          nextNominalAt: null,
          nextEffectiveAt: null,
          updatedAt: now,
        },
        context,
      );
      unlinkedCount++;
    }
  }

  return { deletedCount, unlinkedCount };
}

export function reconcileOrphanedSubscriptionSchedules(): ReconcileOrphanedSchedulesResult {
  return db.transaction((tx) =>
    reconcileOrphanedSubscriptionSchedulesInContext(tx),
  );
}
