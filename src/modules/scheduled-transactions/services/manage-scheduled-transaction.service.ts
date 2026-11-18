import { db, type DbContext } from "@/infrastructure/database/client";
import type { ScheduledTransaction } from "../types/scheduled-transaction.types";
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
  updateScheduledTransactionRecord,
} from "../repositories/scheduled-transactions.repository";

export type RemoveScheduledTransactionResult = "deleted" | "archived";

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
): void {
  db.transaction((tx) => {
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
  });
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
): void {
  const runner = (tx: DbContext) => {
    const schedule = findScheduledTransaction(id, tx);
    if (!schedule) throw new Error("Scheduled transaction was not found.");
    if (!schedule.archivedAt && !options?.status) return;
    const now = new Date();
    updateScheduledTransactionRecord(
      id,
      {
        archivedAt: null,
        status:
          options?.status ??
          (schedule.status === "completed" ? "active" : schedule.status),
        nextNominalAt: options?.nextNominalAt ?? schedule.nextNominalAt,
        nextEffectiveAt: options?.nextEffectiveAt ?? schedule.nextEffectiveAt,
        updatedAt: now,
      },
      tx,
    );
  };

  return context ? runner(context) : db.transaction(runner);
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
