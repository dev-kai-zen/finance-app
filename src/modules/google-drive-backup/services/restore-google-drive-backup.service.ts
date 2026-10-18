import {
  announceDatabaseReplacement,
  replaceDatabaseFromSnapshot,
} from "@/infrastructure/database";
import {
  downloadGoogleDriveBackupFile,
  getQuickSyncConfig,
  resolveGoogleDriveQuickSyncBackupFile,
  saveQuickSyncConfig,
  type GoogleDriveBackupFile,
} from "@/infrastructure/sync";
import { finalizeRestoredWorkspace } from "@/modules/onboarding";
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
  finalizeRestoredWorkspace();

  restoreNotice = `Backup from ${backup.createdAt.toLocaleString()} restored successfully.`;
  setTimeout(announceDatabaseReplacement, 0);
}

export async function restoreQuickSyncBackup(): Promise<void> {
  const config = getQuickSyncConfig();
  let resolvedFileId = config.fileId;
  let resolvedModifiedTime: string | null = null;
  const archive = await withGoogleDriveAccessToken(async (accessToken) => {
    let fileId = config.fileId;
    if (!fileId) {
      const quickSyncFile: GoogleDriveBackupFile | null =
        await resolveGoogleDriveQuickSyncBackupFile(accessToken);
      if (!quickSyncFile) {
        throw new Error("No Quick Sync backup found on Google Drive.");
      }
      resolvedFileId = quickSyncFile.id;
      resolvedModifiedTime = quickSyncFile.modifiedTime;
      fileId = quickSyncFile.id;
    }
    return downloadGoogleDriveBackupFile(accessToken, fileId);
  });

  const backup = await readDatabaseBackup(archive, null);
  await replaceDatabaseFromSnapshot(backup.database);
  finalizeRestoredWorkspace();

  if (resolvedFileId) {
    saveQuickSyncConfig({
      enabled: true,
      fileId: resolvedFileId,
      lastSyncedAt: resolvedModifiedTime ?? new Date().toISOString(),
    });
  }

  const restoredAt = backup.createdAt.toLocaleString();
  restoreNotice = `Quick Sync backup from ${restoredAt} restored successfully.`;
  setTimeout(announceDatabaseReplacement, 0);
}

export function consumeRestoreNotice(): string | null {
  const notice = restoreNotice;
  restoreNotice = null;
  return notice;
}
