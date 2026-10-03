import { asc, eq, inArray } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { labels, transactionLabels } from "@/infrastructure/database/schema";
import type { Label } from "../types/label.types";

export function listLabelsForTransaction(
  transactionId: string,
  context: DbContext = db,
): Label[] {
  const rows = context
    .select({
      id: labels.id,
      name: labels.name,
      color: labels.color,
      sortOrder: labels.sortOrder,
      isArchived: labels.isArchived,
      createdAt: labels.createdAt,
      updatedAt: labels.updatedAt,
    })
    .from(transactionLabels)
    .innerJoin(labels, eq(transactionLabels.labelId, labels.id))
    .where(eq(transactionLabels.transactionId, transactionId))
    .orderBy(asc(labels.sortOrder), asc(labels.name))
    .all();

  return rows;
}

export function getLabelsForTransactionIds(
  transactionIds: string[],
  context: DbContext = db,
): Map<string, Label[]> {
  const result = new Map<string, Label[]>();
  if (transactionIds.length === 0) return result;

  const rows = context
    .select({
      transactionId: transactionLabels.transactionId,
      id: labels.id,
      name: labels.name,
      color: labels.color,
      sortOrder: labels.sortOrder,
      isArchived: labels.isArchived,
      createdAt: labels.createdAt,
      updatedAt: labels.updatedAt,
    })
    .from(transactionLabels)
    .innerJoin(labels, eq(transactionLabels.labelId, labels.id))
    .where(inArray(transactionLabels.transactionId, transactionIds))
    .orderBy(asc(labels.sortOrder), asc(labels.name))
    .all();

  for (const row of rows) {
    const list = result.get(row.transactionId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sortOrder,
      isArchived: row.isArchived,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    result.set(row.transactionId, list);
  }

  return result;
}

export function setTransactionLabels(
  transactionId: string,
  labelIds: string[],
  context: DbContext = db,
): void {
  // Delete existing associations for this transaction
  context
    .delete(transactionLabels)
    .where(eq(transactionLabels.transactionId, transactionId))
    .run();

  // Deduplicate labelIds
  const uniqueLabelIds = Array.from(new Set(labelIds.filter(Boolean)));
  if (uniqueLabelIds.length === 0) return;

  // Filter to only existing labels to ensure foreign key integrity
  const existingLabels = context
    .select({ id: labels.id })
    .from(labels)
    .where(inArray(labels.id, uniqueLabelIds))
    .all();
  const validLabelIds = new Set(existingLabels.map((l) => l.id));

  const now = new Date();
  for (const labelId of uniqueLabelIds) {
    if (!validLabelIds.has(labelId)) continue;
    context
      .insert(transactionLabels)
      .values({
        transactionId,
        labelId,
        createdAt: now,
      })
      .run();
  }
}

export function deleteTransactionLabels(
  transactionId: string,
  context: DbContext = db,
): void {
  context
    .delete(transactionLabels)
    .where(eq(transactionLabels.transactionId, transactionId))
    .run();
}
