import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findTransactionPresetById,
  softDeleteTransactionPreset,
} from "../repositories/transaction-presets.repository";

export function archiveTransactionPreset(
  id: string,
  context: DbContext = db,
): void {
  const run = (tx: DbContext) => {
    const preset = findTransactionPresetById(id, tx);
    if (!preset || preset.deletedAt) {
      throw new Error("This Quick Preset no longer exists.");
    }
    softDeleteTransactionPreset(id, tx);
  };

  if ("transaction" in context && typeof context.transaction === "function") {
    context.transaction(run);
  } else {
    run(context);
  }
}
