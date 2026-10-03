import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findLabelById,
  findLabelByName,
  updateLabelRecord,
} from "../repositories/labels.repository";
import type { Label, UpdateLabelInput } from "../types/label.types";

export function updateLabel(
  id: string,
  input: UpdateLabelInput,
  context: DbContext = db,
): Label {
  const label = findLabelById(id, context);
  if (!label) {
    throw new Error("Label not found.");
  }

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error("Label name cannot be empty.");
    }

    const existing = findLabelByName(trimmedName, context);
    if (existing && existing.id !== id) {
      throw new Error(`A label named "${trimmedName}" already exists.`);
    }
  }

  updateLabelRecord(id, input, context);

  const updated = findLabelById(id, context);
  if (!updated) {
    throw new Error("Failed to load updated label.");
  }
  return updated;
}
