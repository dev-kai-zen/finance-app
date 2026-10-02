import { randomUUID } from "expo-crypto";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import { syncOperations } from "@/infrastructure/database/schema";

export type SyncOperationKind = "upload" | "delete";

export interface SyncOperation<TPayload = unknown> {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperationKind;
  payload: TPayload;
  attemptCount: number;
  nextAttemptAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function enqueueSyncOperation(
  input: {
    entityType: string;
    entityId: string;
    operation: SyncOperationKind;
    payload?: unknown;
  },
  context: DbContext = db,
): string {
  const now = new Date();
  const id = randomUUID();
  context
    .insert(syncOperations)
    .values({
      id,
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      payload: JSON.stringify(input.payload ?? {}),
      attemptCount: 0,
      nextAttemptAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

export function listDueSyncOperations<TPayload = unknown>(
  entityType: string,
  limit = 20,
  context: DbContext = db,
): SyncOperation<TPayload>[] {
  const now = new Date();
  return context
    .select()
    .from(syncOperations)
    .where(
      and(
        eq(syncOperations.entityType, entityType),
        or(
          isNull(syncOperations.nextAttemptAt),
          lte(syncOperations.nextAttemptAt, now),
        ),
      ),
    )
    .orderBy(asc(syncOperations.createdAt))
    .limit(limit)
    .all()
    .map((row) => ({
      ...row,
      operation: row.operation as SyncOperationKind,
      payload: parsePayload<TPayload>(row.payload),
    }));
}

export function completeSyncOperation(
  id: string,
  context: DbContext = db,
): void {
  context.delete(syncOperations).where(eq(syncOperations.id, id)).run();
}

export function failSyncOperation(
  id: string,
  attemptCount: number,
  message: string,
  context: DbContext = db,
): void {
  const delayMinutes = Math.min(60, Math.max(1, 2 ** attemptCount));
  const now = new Date();
  context
    .update(syncOperations)
    .set({
      attemptCount,
      lastError: message,
      nextAttemptAt: new Date(now.getTime() + delayMinutes * 60_000),
      updatedAt: now,
    })
    .where(eq(syncOperations.id, id))
    .run();
}

export function retrySyncOperationsForEntity(
  entityType: string,
  entityId: string,
  context: DbContext = db,
): void {
  context
    .update(syncOperations)
    .set({ nextAttemptAt: null, lastError: null, updatedAt: new Date() })
    .where(
      and(
        eq(syncOperations.entityType, entityType),
        eq(syncOperations.entityId, entityId),
      ),
    )
    .run();
}

function parsePayload<TPayload>(value: string): TPayload {
  try {
    return JSON.parse(value) as TPayload;
  } catch {
    return {} as TPayload;
  }
}
