import { and, asc, eq, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { labels, transactionLabels } from "@/infrastructure/database/schema";
import type { Label, NewLabel } from "../types/label.types";

export function generateLabelId(context: DbContext = db): string {
  return context.get<{ id: string }>(
    sql`SELECT 'lbl_' || lower(hex(randomblob(8))) AS id`,
  )!.id;
}

export function listLabels(
  options: { includeArchived?: boolean } = {},
  context: DbContext = db,
): Label[] {
  const query = context
    .select({
      id: labels.id,
      name: labels.name,
      color: labels.color,
      sortOrder: labels.sortOrder,
      isArchived: labels.isArchived,
      createdAt: labels.createdAt,
      updatedAt: labels.updatedAt,
      usageCount: sql<number>`(
        SELECT count(*) FROM transaction_labels tl WHERE tl.label_id = ${labels.id}
      )`,
    })
    .from(labels)
    .orderBy(asc(labels.sortOrder), asc(labels.name));

  if (!options.includeArchived) {
    return query.where(eq(labels.isArchived, false)).all();
  }

  return query.all();
}

export function findLabelById(
  id: string,
  context: DbContext = db,
): Label | null {
  return (
    context
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        sortOrder: labels.sortOrder,
        isArchived: labels.isArchived,
        createdAt: labels.createdAt,
        updatedAt: labels.updatedAt,
        usageCount: sql<number>`(
          SELECT count(*) FROM transaction_labels tl WHERE tl.label_id = ${labels.id}
        )`,
      })
      .from(labels)
      .where(eq(labels.id, id))
      .get() ?? null
  );
}

export function findLabelByName(
  name: string,
  context: DbContext = db,
): Label | null {
  const normalized = name.trim().toLowerCase();
  return (
    context
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        sortOrder: labels.sortOrder,
        isArchived: labels.isArchived,
        createdAt: labels.createdAt,
        updatedAt: labels.updatedAt,
        usageCount: sql<number>`(
          SELECT count(*) FROM transaction_labels tl WHERE tl.label_id = ${labels.id}
        )`,
      })
      .from(labels)
      .where(sql`lower(${labels.name}) = ${normalized}`)
      .get() ?? null
  );
}

export function getMaxSortOrder(context: DbContext = db): number {
  const row = context
    .select({ maxOrder: sql<number>`max(${labels.sortOrder})` })
    .from(labels)
    .get();
  return row?.maxOrder ?? 0;
}

export function insertLabel(
  data: NewLabel,
  context: DbContext = db,
): Label {
  const now = new Date();
  const id = data.id ?? generateLabelId(context);
  const record = {
    id,
    name: data.name.trim(),
    color: data.color?.trim() || null,
    sortOrder: data.sortOrder ?? 0,
    isArchived: Boolean(data.isArchived),
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };

  context.insert(labels).values(record).run();
  return { ...record, usageCount: 0 };
}

export function updateLabelRecord(
  id: string,
  values: Partial<Pick<NewLabel, "name" | "color" | "sortOrder" | "isArchived">>,
  context: DbContext = db,
): void {
  const patch: Partial<typeof labels.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (values.name !== undefined) {
    patch.name = values.name.trim();
  }
  if (values.color !== undefined) {
    patch.color = values.color?.trim() || null;
  }
  if (values.sortOrder !== undefined) {
    patch.sortOrder = values.sortOrder;
  }
  if (values.isArchived !== undefined) {
    patch.isArchived = values.isArchived;
  }

  context.update(labels).set(patch).where(eq(labels.id, id)).run();
}

export function deleteLabelRecord(
  id: string,
  context: DbContext = db,
): void {
  context.delete(labels).where(eq(labels.id, id)).run();
}

export function countLabelUsage(
  id: string,
  context: DbContext = db,
): number {
  const row = context
    .select({ count: sql<number>`count(*)` })
    .from(transactionLabels)
    .where(eq(transactionLabels.labelId, id))
    .get();
  return row?.count ?? 0;
}
