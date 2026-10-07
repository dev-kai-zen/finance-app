import {
  announceDatabaseReplacement,
  db,
} from "@/infrastructure/database";
import { clearLocalBackupStorage } from "@/modules/local-backup";
import { clearNoteAttachmentStorage } from "@/modules/notes";
import { clearTransactionAttachmentStorage } from "@/modules/transactions";
import { deleteAllUserData } from "../repositories/reset-data.repository";

export async function resetAppData(): Promise<void> {
  await db.transaction(async (tx) => {
    deleteAllUserData(tx);
  });

  clearAppManagedFiles();
  setTimeout(announceDatabaseReplacement, 0);
}

function clearAppManagedFiles(): void {
  const cleanups = [
    clearLocalBackupStorage,
    clearNoteAttachmentStorage,
    clearTransactionAttachmentStorage,
  ];

  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      console.warn("[RESET DATA] App-managed file cleanup failed.", error);
    }
  }
}
