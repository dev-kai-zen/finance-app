import { db } from "@/infrastructure/database/client";
import {
  listActiveTransactionPresets,
  updateTransactionPresetRecord,
} from "../repositories/transaction-presets.repository";

export function reorderTransactionPresets(orderedIds: string[]): void {
  if (orderedIds.length === 0) return;

  db.transaction((tx) => {
    const activeIds = new Set(
      listActiveTransactionPresets(tx).map((preset) => preset.id),
    );
    if (
      orderedIds.length !== activeIds.size ||
      orderedIds.some((id) => !activeIds.has(id))
    ) {
      throw new Error("The Quick Preset list changed. Refresh and try again.");
    }

    const now = new Date();
    orderedIds.forEach((id, sortOrder) => {
      updateTransactionPresetRecord(id, { sortOrder, updatedAt: now }, tx);
    });
  });
}

