import { db, type DbContext } from "@/infrastructure/database/client";
import type { ScheduledTransaction } from "../types/scheduled-transaction.types";
import { calculateScheduleOccurrence } from "../utils/recurrence";
import { processDueSchedules, resolveRecordedOccurrence } from "./process-due-schedules.service";
import {
  deleteAllScheduledTransactionRecords,
  deleteScheduledTransactionRecord,
  deleteUnprocessedScheduleOccurrences,
  findScheduleBySubscriptionId,
  findScheduledTransaction,
  getAccountIdsWithSchedules as repoGetAccountIdsWithSchedules,
  getPocketIdsWithSchedules as repoGetPocketIdsWithSchedules,
  hasSchedulePostings,
  hasSchedulesForAccount as repoHasSchedulesForAccount,
  hasSchedulesForPocket as repoHasSchedulesForPocket,
  listScheduleIdsWithPostings,
  reassignScheduledTransactionCategoryRecords as repoReassignScheduledTransactionCategoryRecords,
  updateScheduledTransactionRecord,
} from "../repositories/scheduled-transactions.repository";

export type RemoveScheduledTransactionResult = "deleted" | "archived";
export type RestoreScheduledTransactionResult = "active" | "paused" | "completed";

const MAX_RESTORE_SEQUENCE_SCAN = 500;

function resolveRestoredScheduleCursor(
  schedule: ScheduledTransaction,
  targetStatus: "active" | "paused",
  context: DbContext,
): {
  status: RestoreScheduledTransactionResult;
  nextOccurrenceNumber: number;
  nextNominalAt: Date | null;
  nextEffectiveAt: Date | null;
} {
  let sequence = schedule.nextOccurrenceNumber;
  for (let step = 0; step < MAX_RESTORE_SEQUENCE_SCAN; step += 1) {
    const occurrence = calculateScheduleOccurrence(schedule, sequence);
    if (!occurrence) {
      return {
        status: "completed",
        nextOccurrenceNumber: sequence,
        nextNominalAt: null,
        nextEffectiveAt: null,
      };
    }
    const existing = resolveRecordedOccurrence(schedule.id, occurrence, context);
    if (existing && (existing.status === "posted" || existing.status === "skipped")) {
      sequence = occurrence.sequenceNumber + 1;
      continue;
    }
    return {
      status: targetStatus,
      nextOccurrenceNumber: occurrence.sequenceNumber,
      nextNominalAt: occurrence.nominalAt,
      nextEffectiveAt: occurrence.effectiveAt ?? occurrence.nominalAt,
    };
  }
  return {
    status: "completed",
    nextOccurrenceNumber: sequence,
    nextNominalAt: null,
    nextEffectiveAt: null,
  };
}

export function hasScheduledTransactionPostings(id: string): boolean {
  return hasSchedulePostings(id);
}

export function getScheduleIdsWithPostings(): Set<string> {
  return listScheduleIdsWithPostings();
}

export function permanentlyDeleteScheduledTransaction(id: string): void {
  db.transaction((tx) => {
    const schedule = findScheduledTransaction(id, tx);
    if (!schedule) throw new Error("Scheduled transaction was not found.");
    deleteScheduledTransactionRecord(id, tx);
  });
}

export function setScheduledTransactionPaused(
  id: string,
  paused: boolean,
  context?: DbContext,
): void {
  const runner = (tx: DbContext) => {
    const schedule = findScheduledTransaction(id, tx);
    if (!schedule) throw new Error("Scheduled transaction was not found.");
    if (schedule.status === "completed") {
      throw new Error("A completed schedule cannot be resumed.");
    }
    if (paused) {
      deleteUnprocessedScheduleOccurrences(id, tx);
    }
    updateScheduledTransactionRecord(
      id,
      { status: paused ? "paused" : "active", updatedAt: new Date() },
      tx,
    );
  };

  if (context) {
    runner(context);
  } else {
    db.transaction(runner);
    if (!paused) {
      try {
        processDueSchedules(new Date(), 1);
      } catch {
        // Ignore
      }
    }
  }
}

export function endScheduledTransaction(id: string): void {
  db.transaction((tx) => {
    const schedule = findScheduledTransaction(id, tx);
    if (!schedule) throw new Error("Scheduled transaction was not found.");
    updateScheduledTransactionRecord(
      id,
      {
        status: "completed",
        nextNominalAt: null,
        nextEffectiveAt: null,
        updatedAt: new Date(),
      },
      tx,
    );
  });
}

export function getScheduledTransaction(
  id: string,
  context: DbContext = db,
): ScheduledTransaction | null {
  return findScheduledTransaction(id, context);
}

export function getScheduleBySubscriptionId(
  subscriptionId: string,
  context: DbContext = db,
): ScheduledTransaction | null {
  return findScheduleBySubscriptionId(subscriptionId, context);
}

export function removeScheduledTransaction(
  id: string,
  context?: DbContext,
): RemoveScheduledTransactionResult {
  const runner = (tx: DbContext): RemoveScheduledTransactionResult => {
    const schedule = findScheduledTransaction(id, tx);
    if (!schedule) throw new Error("Scheduled transaction was not found.");

    if (!hasSchedulePostings(id, tx)) {
      deleteScheduledTransactionRecord(id, tx);
      return "deleted";
    }

    const now = new Date();
    deleteUnprocessedScheduleOccurrences(id, tx);
    updateScheduledTransactionRecord(
      id,
      {
        status: "completed",
        nextNominalAt: null,
        nextEffectiveAt: null,
        archivedAt: now,
        updatedAt: now,
      },
      tx,
    );
    return "archived";
  };

  return context ? runner(context) : db.transaction(runner);
}

export function restoreScheduledTransaction(
  id: string,
  options?: {
    status?: "active" | "paused";
    nextNominalAt?: Date;
    nextEffectiveAt?: Date;
  },
  context?: DbContext,
): RestoreScheduledTransactionResult {
  let result: RestoreScheduledTransactionResult = "active";
  const runner = (tx: DbContext) => {
    const schedule = findScheduledTransaction(id, tx);
    if (!schedule) throw new Error("Scheduled transaction was not found.");
    if (!schedule.archivedAt && !options?.status) {
      result =
        schedule.status === "paused"
          ? "paused"
          : schedule.status === "completed"
            ? "completed"
            : "active";
      return;
    }
    const now = new Date();
    const targetStatus: "active" | "paused" =
      options?.status ??
      (schedule.status === "completed" ? "active" : schedule.status === "paused" ? "paused" : "active");
    const needsReanchor =
      options?.nextNominalAt === undefined &&
      options?.nextEffectiveAt === undefined &&
      (schedule.nextNominalAt === null || schedule.nextEffectiveAt === null) &&
      (targetStatus === "active" || targetStatus === "paused");
    let nextNominalAt = options?.nextNominalAt ?? schedule.nextNominalAt;
    let nextEffectiveAt = options?.nextEffectiveAt ?? schedule.nextEffectiveAt;
    let status: ScheduledTransaction["status"] = targetStatus;
    let nextOccurrenceNumber = schedule.nextOccurrenceNumber;

    if (needsReanchor) {
      const resolved = resolveRestoredScheduleCursor(schedule, targetStatus, tx);
      result = resolved.status;
      nextOccurrenceNumber = resolved.nextOccurrenceNumber;
      nextNominalAt = resolved.nextNominalAt;
      nextEffectiveAt = resolved.nextEffectiveAt;
      status = resolved.status === "completed" ? "completed" : targetStatus;
    } else {
      result = targetStatus;
    }

    updateScheduledTransactionRecord(
      id,
      {
        archivedAt: null,
        status,
        nextOccurrenceNumber,
        nextNominalAt,
        nextEffectiveAt,
        updatedAt: now,
      },
      tx,
    );
  };

  if (context) {
    runner(context);
  } else {
    db.transaction(runner);
    if (result === "active") {
      try {
        processDueSchedules(new Date(), 1);
      } catch {
        // Ignore background due processing errors.
      }
    }
  }
  return result;
}

export function clearScheduledTransactionWorkspace(context: DbContext): void {
  deleteAllScheduledTransactionRecords(context);
}

export function hasSchedulesForAccount(
  accountId: string,
  context: DbContext = db,
): boolean {
  return repoHasSchedulesForAccount(accountId, context);
}

export function getAccountIdsWithSchedules(
  context: DbContext = db,
): Set<string> {
  return repoGetAccountIdsWithSchedules(context);
}

export function hasSchedulesForPocket(
  pocketId: string,
  context: DbContext = db,
): boolean {
  return repoHasSchedulesForPocket(pocketId, context);
}

export function getPocketIdsWithSchedules(
  context: DbContext = db,
): Set<string> {
  return repoGetPocketIdsWithSchedules(context);
}

export function unlinkScheduledTransactionSubscription(
  id: string,
  context?: DbContext,
): void {
  const runner = (tx: DbContext) => {
    updateScheduledTransactionRecord(
      id,
      { subscriptionId: null, updatedAt: new Date() },
      tx,
    );
  };
  return context ? runner(context) : db.transaction(runner);
}

export function reassignScheduledTransactionCategoryReferences(
  fromCategoryId: string,
  toCategoryId: string,
  context: DbContext = db,
): void {
  repoReassignScheduledTransactionCategoryRecords(fromCategoryId, toCategoryId, context);
}

