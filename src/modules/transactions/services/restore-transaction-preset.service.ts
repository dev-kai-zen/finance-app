import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findTransactionPresetById,
  restoreTransactionPresetRecord,
} from "../repositories/transaction-presets.repository";

export function restoreTransactionPreset(
  id: string,
  context: DbContext = db,
): void {
  const run = (tx: DbContext) => {
    const preset = findTransactionPresetById(id, tx);
    if (!preset) {
      throw new Error("This Quick Preset no longer exists.");
    }
    if (!preset.deletedAt) return;
    restoreTransactionPresetRecord(id, tx);
  };

  if ("transaction" in context && typeof context.transaction === "function") {
    context.transaction(run);
  } else {
    run(context);
  }
}
