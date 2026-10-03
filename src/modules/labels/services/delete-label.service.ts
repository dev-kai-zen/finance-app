import { db, type DbContext } from "@/infrastructure/database/client";
import {
  deleteLabelRecord,
  findLabelById,
} from "../repositories/labels.repository";

export function deleteLabel(id: string, context: DbContext = db): void {
  const label = findLabelById(id, context);
  if (!label) {
    throw new Error("Label not found.");
  }
  if ((label.usageCount ?? 0) > 0) {
    throw new Error(
      `Cannot delete label "#${label.name}" because it is currently assigned to ${label.usageCount} transaction${label.usageCount === 1 ? "" : "s"}. Archive it instead.`,
    );
  }
  deleteLabelRecord(id, context);
}
