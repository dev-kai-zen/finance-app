import { db, type DbContext } from "@/infrastructure/database/client";
import { updateLabelRecord } from "../repositories/labels.repository";

export function reorderLabels(
  orderedIds: string[],
  context: DbContext = db,
): void {
  orderedIds.forEach((id, index) => {
    updateLabelRecord(id, { sortOrder: index + 1 }, context);
  });
}
