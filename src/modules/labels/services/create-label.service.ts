import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findLabelByName,
  getMaxSortOrder,
  insertLabel,
} from "../repositories/labels.repository";
import type { CreateLabelInput, Label } from "../types/label.types";

export function createLabel(
  input: CreateLabelInput,
  context: DbContext = db,
): Label {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Label name cannot be empty.");
  }

  const existing = findLabelByName(trimmedName, context);
  if (existing) {
    throw new Error(`A label named "${trimmedName}" already exists.`);
  }

  const maxOrder = getMaxSortOrder(context);

  return insertLabel(
    {
      name: trimmedName,
      color: input.color?.trim() || null,
      sortOrder: maxOrder + 1,
      isArchived: false,
    },
    context,
  );
}
