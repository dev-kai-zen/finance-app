import { db, type DbContext } from "@/infrastructure/database/client";
import {
  deleteImportBatch,
  listLatestImportBatches,
} from "../repositories/data-import.repository";
import type { ImportBatchRecord } from "../types/data-import.types";

export function getLatestImportBatches(
  limitOrContext: number | DbContext = 30,
  contextOrLimit?: DbContext | number,
): ImportBatchRecord[] {
  return listLatestImportBatches(limitOrContext, contextOrLimit);
}

export function removeImportBatch(
  batchId: string,
  context: DbContext = db,
): void {
  deleteImportBatch(batchId, context);
}

