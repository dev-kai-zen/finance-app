import {
  announceDatabaseReplacement,
  db,
} from "@/infrastructure/database";
import { deleteAllUserData } from "../repositories/reset-data.repository";

export async function resetAppData(): Promise<void> {
  const { resetGoogleDriveConnectionForAppReset } =
    require("@/modules/google-drive-backup") as typeof import("@/modules/google-drive-backup");
  await resetGoogleDriveConnectionForAppReset();

  await db.transaction(async (tx) => {
    deleteAllUserData(tx);
  });

  clearAppManagedFiles();
  setTimeout(announceDatabaseReplacement, 0);
}

function clearAppManagedFiles(): void {
  const { clearLocalBackupStorage } =
    require("@/modules/local-backup") as typeof import("@/modules/local-backup");
  const { clearNoteAttachmentStorage } =
    require("@/modules/notes") as typeof import("@/modules/notes");
  const { clearTransactionAttachmentStorage } =
    require("@/modules/transactions") as typeof import("@/modules/transactions");

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
