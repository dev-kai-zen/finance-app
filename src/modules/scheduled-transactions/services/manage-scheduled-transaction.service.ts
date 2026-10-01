import { db, type DbContext } from "@/infrastructure/database/client";
import {
  deleteAllScheduledTransactionRecords,
  deleteScheduledTransactionRecord,
  deleteUnprocessedScheduleOccurrences,
  findScheduledTransaction,
  hasProcessedScheduleOccurrences,
  updateScheduledTransactionRecord,
} from "../repositories/scheduled-transactions.repository";

export type RemoveScheduledTransactionResult = "deleted" | "archived";

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

export function removeScheduledTransaction(
  id: string,
): RemoveScheduledTransactionResult {
  return db.transaction((tx) => {
    const schedule = findScheduledTransaction(id, tx);
    if (!schedule) throw new Error("Scheduled transaction was not found.");

    if (!hasProcessedScheduleOccurrences(id, tx)) {
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
  });
}

export function clearScheduledTransactionWorkspace(
  context: DbContext,
): void {
  deleteAllScheduledTransactionRecords(context);
}
