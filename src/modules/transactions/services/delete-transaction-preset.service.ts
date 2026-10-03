import { db, type DbContext } from "@/infrastructure/database/client";
import { archiveTransactionPreset } from "./archive-transaction-preset.service";

export { archiveTransactionPreset };

export function deleteTransactionPreset(id: string, context: DbContext = db): void {
  archiveTransactionPreset(id, context);
}

