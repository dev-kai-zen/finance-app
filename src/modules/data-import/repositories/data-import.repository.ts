import { desc, eq, inArray } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  importBatches,
  importedSourceIdentities,
} from "@/infrastructure/database/schema";
import type { ImportBatchRecord } from "../types/data-import.types";

export function generateId(): string {
  return "imp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function findExistingSourceIdentities(
  identities: string[],
  context: DbContext = db,
): Set<string> {
  if (identities.length === 0) return new Set();

  const chunkSize = 500;
  const found = new Set<string>();

  for (let i = 0; i < identities.length; i += chunkSize) {
    const chunk = identities.slice(i, i + chunkSize);
    const rows = context
      .select({ sourceIdentity: importedSourceIdentities.sourceIdentity })
      .from(importedSourceIdentities)
      .where(inArray(importedSourceIdentities.sourceIdentity, chunk))
      .all();

    for (const r of rows) {
      found.add(r.sourceIdentity);
    }
  }

  return found;
}

export interface InsertBatchParams {
  id?: string;
  fileName: string;
  importType: string;
  sourceName: string;
  importedCount: number;
  leftOutCount: number;
  summary: string;
  createdAt: Date;
}

export function insertImportBatch(
  params: InsertBatchParams,
  context: DbContext = db,
): string {
  const id = params.id ?? generateId();
  context
    .insert(importBatches)
    .values({
      id,
      fileName: params.fileName,
      importType: params.importType,
      sourceName: params.sourceName,
      importedCount: params.importedCount,
      leftOutCount: params.leftOutCount,
      summary: params.summary,
      createdAt: params.createdAt,
    })
    .run();
  return id;
}

export interface InsertSourceIdentityRow {
  batchId: string;
  sourceIdentity: string;
  rowNumber: number;
  createdRecordIds: string[]; // will be JSON.stringify'd
  createdAt: Date;
}

export function insertImportedSourceIdentities(
  rows: InsertSourceIdentityRow[],
  context: DbContext = db,
): void {
  if (rows.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      id: generateId(),
      batchId: r.batchId,
      sourceIdentity: r.sourceIdentity,
      rowNumber: r.rowNumber,
      createdRecordIds: JSON.stringify(r.createdRecordIds),
      createdAt: r.createdAt,
    }));

    context.insert(importedSourceIdentities).values(chunk).run();
  }
}

export function listLatestImportBatches(
  limitOrContext: number | DbContext = 30,
  contextOrLimit?: DbContext | number,
): ImportBatchRecord[] {
  let limit = 30;
  let context: DbContext = db;

  if (typeof limitOrContext === "number") {
    limit = limitOrContext;
    if (contextOrLimit && typeof contextOrLimit !== "number") {
      context = contextOrLimit;
    }
  } else {
    context = limitOrContext;
    if (typeof contextOrLimit === "number") {
      limit = contextOrLimit;
    }
  }

  const rows = context
    .select()
    .from(importBatches)
    .orderBy(desc(importBatches.createdAt))
    .limit(limit)
    .all();

  return rows.map((r) => {
    let parsedSummary: any = {};
    try {
      parsedSummary = JSON.parse(r.summary);
    } catch {
      parsedSummary = {};
    }
    return {
      id: r.id,
      fileName: r.fileName,
      importType: r.importType as "transactions" | "accounts",
      sourceName: r.sourceName,
      importedCount: r.importedCount,
      leftOutCount: r.leftOutCount,
      summary: parsedSummary,
      createdAt: r.createdAt,
    };
  });
}

export function deleteImportBatch(
  batchId: string,
  context: DbContext = db,
): void {
  context.delete(importBatches).where(eq(importBatches.id, batchId)).run();
}

