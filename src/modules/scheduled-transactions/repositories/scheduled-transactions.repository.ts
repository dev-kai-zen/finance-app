import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import {
  transactionScheduleOccurrences,
  transactionSchedulePostings,
  transactionSchedules,
} from "@/infrastructure/database/schema";
import type {
  ScheduleOccurrence,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";

function generateScheduleId(context: DbContext): string {
  return context.get<{ id: string }>(
    sql`SELECT lower(hex(randomblob(16))) AS id`,
  )!.id;
}

function mapSchedule(
  row: typeof transactionSchedules.$inferSelect,
): ScheduledTransaction {
  return row as ScheduledTransaction;
}

function mapOccurrence(
  row: typeof transactionScheduleOccurrences.$inferSelect,
): ScheduleOccurrence {
  return row as ScheduleOccurrence;
}

export function listScheduledTransactions(
  options: { includeArchived?: boolean } = {},
  context: DbContext = db,
): ScheduledTransaction[] {
  const query = context
    .select()
    .from(transactionSchedules)
    .orderBy(
      asc(transactionSchedules.status),
      asc(transactionSchedules.nextEffectiveAt),
      desc(transactionSchedules.updatedAt),
    );
  const rows = options.includeArchived
    ? query.all()
    : query.where(isNull(transactionSchedules.archivedAt)).all();
  return rows
    .map(mapSchedule);
}

export function findScheduledTransaction(
  id: string,
  context: DbContext = db,
): ScheduledTransaction | null {
  const row = context
    .select()
    .from(transactionSchedules)
    .where(eq(transactionSchedules.id, id))
    .get();
  return row ? mapSchedule(row) : null;
}

export function listDueScheduledTransactions(
  now: Date,
  limit = 100,
  context: DbContext = db,
): ScheduledTransaction[] {
  return context
    .select()
    .from(transactionSchedules)
    .where(
      and(
        eq(transactionSchedules.status, "active"),
        lte(transactionSchedules.nextEffectiveAt, now),
      ),
    )
    .orderBy(asc(transactionSchedules.nextEffectiveAt))
    .limit(limit)
    .all()
    .map(mapSchedule);
}

export function insertScheduledTransaction(
  values: Omit<typeof transactionSchedules.$inferInsert, "id"> & {
    id?: string;
  },
  context: DbContext = db,
): ScheduledTransaction {
  const id = values.id ?? generateScheduleId(context);
  const row = { ...values, id };
  context.insert(transactionSchedules).values(row).run();
  return findScheduledTransaction(id, context)!;
}

export function updateScheduledTransactionRecord(
  id: string,
  values: Partial<typeof transactionSchedules.$inferInsert>,
  context: DbContext = db,
): void {
  context
    .update(transactionSchedules)
    .set(values)
    .where(eq(transactionSchedules.id, id))
    .run();
}

export function deleteScheduledTransactionRecord(
  id: string,
  context: DbContext = db,
): void {
  context
    .delete(transactionSchedules)
    .where(eq(transactionSchedules.id, id))
    .run();
}

export function hasProcessedScheduleOccurrences(
  scheduleId: string,
  context: DbContext = db,
): boolean {
  return Boolean(
    context
      .select({ id: transactionScheduleOccurrences.id })
      .from(transactionScheduleOccurrences)
      .where(
        and(
          eq(transactionScheduleOccurrences.scheduleId, scheduleId),
          isNotNull(transactionScheduleOccurrences.processedAt),
        ),
      )
      .limit(1)
      .get(),
  );
}

export function deleteUnprocessedScheduleOccurrences(
  scheduleId: string,
  context: DbContext = db,
): void {
  context
    .delete(transactionScheduleOccurrences)
    .where(
      and(
        eq(transactionScheduleOccurrences.scheduleId, scheduleId),
        isNull(transactionScheduleOccurrences.processedAt),
      ),
    )
    .run();
}

export function findScheduleOccurrence(
  scheduleId: string,
  sequenceNumber: number,
  context: DbContext = db,
): ScheduleOccurrence | null {
  const row = context
    .select()
    .from(transactionScheduleOccurrences)
    .where(
      and(
        eq(transactionScheduleOccurrences.scheduleId, scheduleId),
        eq(transactionScheduleOccurrences.sequenceNumber, sequenceNumber),
      ),
    )
    .get();
  return row ? mapOccurrence(row) : null;
}

export function findScheduleOccurrenceById(
  id: string,
  context: DbContext = db,
): ScheduleOccurrence | null {
  const row = context
    .select()
    .from(transactionScheduleOccurrences)
    .where(eq(transactionScheduleOccurrences.id, id))
    .get();
  return row ? mapOccurrence(row) : null;
}

export function listScheduleOccurrences(
  scheduleId?: string,
  context: DbContext = db,
): ScheduleOccurrence[] {
  const query = context
    .select()
    .from(transactionScheduleOccurrences)
    .orderBy(desc(transactionScheduleOccurrences.nominalDueAt));
  const rows = scheduleId
    ? query
        .where(eq(transactionScheduleOccurrences.scheduleId, scheduleId))
        .all()
    : query.all();
  return rows.map(mapOccurrence);
}

export function listDueManualOccurrences(
  now: Date,
  context: DbContext = db,
): ScheduleOccurrence[] {
  return context
    .select()
    .from(transactionScheduleOccurrences)
    .where(
      and(
        eq(transactionScheduleOccurrences.status, "due"),
        lte(transactionScheduleOccurrences.effectiveDueAt, now),
      ),
    )
    .orderBy(asc(transactionScheduleOccurrences.effectiveDueAt))
    .all()
    .map(mapOccurrence);
}

export function insertScheduleOccurrence(
  values: Omit<typeof transactionScheduleOccurrences.$inferInsert, "id">,
  context: DbContext = db,
): ScheduleOccurrence {
  const id = generateScheduleId(context);
  context
    .insert(transactionScheduleOccurrences)
    .values({ ...values, id })
    .run();
  return findScheduleOccurrence(
    values.scheduleId,
    values.sequenceNumber,
    context,
  )!;
}

export function updateScheduleOccurrenceRecord(
  id: string,
  values: Partial<typeof transactionScheduleOccurrences.$inferInsert>,
  context: DbContext = db,
): void {
  context
    .update(transactionScheduleOccurrences)
    .set(values)
    .where(eq(transactionScheduleOccurrences.id, id))
    .run();
}

export function insertSchedulePosting(
  occurrenceId: string,
  transactionId: string,
  now: Date,
  context: DbContext = db,
): void {
  context
    .insert(transactionSchedulePostings)
    .values({
      id: generateScheduleId(context),
      occurrenceId,
      transactionId,
      createdAt: now,
    })
    .run();
}

export function deleteAllScheduledTransactionRecords(
  context: DbContext = db,
): void {
  context.delete(transactionSchedules).run();
}
