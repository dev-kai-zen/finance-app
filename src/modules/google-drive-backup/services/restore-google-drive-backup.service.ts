import {
  announceDatabaseReplacement,
  replaceDatabaseFromSnapshot,
} from "@/infrastructure/database";
import {
  downloadGoogleDriveBackupFile,
  getQuickSyncConfig,
  resolveGoogleDriveQuickSyncBackupFile,
  saveQuickSyncConfig,
} from "@/infrastructure/sync";
import { readDatabaseBackup } from "@/modules/local-backup";
import { withGoogleDriveAccessToken } from "./google-drive-auth.service";

let restoreNotice: string | null = null;

export async function restoreGoogleDriveBackup(
  fileId: string,
  passphrase: string | null,
): Promise<void> {
  const archive = await withGoogleDriveAccessToken((accessToken) =>
    downloadGoogleDriveBackupFile(accessToken, fileId),
  );
  const backup = await readDatabaseBackup(archive, passphrase);
  await replaceDatabaseFromSnapshot(backup.database);

  restoreNotice = `Backup from ${backup.createdAt.toLocaleString()} restored successfully.`;
  setTimeout(announceDatabaseReplacement, 0);
}

export async function restoreQuickSyncBackup(): Promise<void> {
  const config = getQuickSyncConfig();
  const archive = await withGoogleDriveAccessToken(async (accessToken) => {
    let fileId = config.fileId;
    if (!fileId) {
      const quickSyncFile = await resolveGoogleDriveQuickSyncBackupFile(
        accessToken,
      );
      if (!quickSyncFile) {
        throw new Error("No Quick Sync backup found on Google Drive.");
      }
      fileId = quickSyncFile.id;
      saveQuickSyncConfig({ fileId });
    }
    return downloadGoogleDriveBackupFile(accessToken, fileId);
  });

  const backup = await readDatabaseBackup(archive, null);
  await replaceDatabaseFromSnapshot(backup.database);

  const restoredAt = backup.createdAt.toLocaleString();
  restoreNotice = `Quick Sync backup from ${restoredAt} restored successfully.`;
  setTimeout(announceDatabaseReplacement, 0);
}

export function consumeRestoreNotice(): string | null {
  const notice = restoreNotice;
  restoreNotice = null;
  return notice;
}
