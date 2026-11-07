import { db, type DbContext } from "@/infrastructure/database/client";
import { listLabels } from "../repositories/labels.repository";
import type { Label } from "../types/label.types";

export function getLabels(
  context: DbContext = db,
  options?: { includeArchived?: boolean },
): Label[] {
  return listLabels(options, context);
}

