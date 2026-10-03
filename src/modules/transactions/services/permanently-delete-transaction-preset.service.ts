import { db, type DbContext } from "@/infrastructure/database/client";
import {
  deleteTransactionPresetRecord,
  findTransactionPresetById,
} from "../repositories/transaction-presets.repository";

export function permanentlyDeleteTransactionPreset(
  id: string,
  context: DbContext = db,
): void {
  const run = (tx: DbContext) => {
    const preset = findTransactionPresetById(id, tx);
    if (!preset) {
      throw new Error("This Quick Preset no longer exists.");
    }
    deleteTransactionPresetRecord(id, tx);
  };

  if ("transaction" in context && typeof context.transaction === "function") {
    context.transaction(run);
  } else {
    run(context);
  }
}
