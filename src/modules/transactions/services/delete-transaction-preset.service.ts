import { db } from "@/infrastructure/database/client";
import {
  findTransactionPresetById,
  softDeleteTransactionPreset,
} from "../repositories/transaction-presets.repository";

export function deleteTransactionPreset(id: string): void {
  db.transaction((tx) => {
    const preset = findTransactionPresetById(id, tx);
    if (!preset || preset.deletedAt) {
      throw new Error("This Quick Preset no longer exists.");
    }
    softDeleteTransactionPreset(id, tx);
  });
}

