import {
  announceDatabaseReplacement,
  replaceDatabaseFromSnapshot,
} from "@/infrastructure/database";
import {
  clearQuickSyncRemoteConflict,
  downloadGoogleDriveBackupFile,
  getGoogleDriveQuickSyncFileMetadata,
  getQuickSyncConfig,
  markQuickSyncLocalChangesPending,
  resolveGoogleDriveQuickSyncBackupFile,
  saveQuickSyncConfig,
  setQuickSyncRuntimeStatus,
  updateQuickSyncDeviceMetadata,
  type GoogleDriveQuickSyncMetadata,
} from "@/infrastructure/sync";
import { finalizeRestoredWorkspace } from "@/modules/onboarding";
import { readDatabaseBackup } from "@/modules/local-backup";
import {
  restoreGoogleDriveSession,
  withGoogleDriveAccessToken,
} from "./google-drive-auth.service";

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
  markQuickSyncLocalChangesPending();

  restoreNotice = `Backup from ${backup.createdAt.toLocaleString()} restored successfully.`;
  setTimeout(announceDatabaseReplacement, 0);
}

export async function restoreQuickSyncBackup(
  explicitFileId?: string,
): Promise<void> {
  const config = getQuickSyncConfig();
  const currentUser = await restoreGoogleDriveSession().catch(() => null);
  let resolvedMetadata: GoogleDriveQuickSyncMetadata | null = null;

  const archive = await withGoogleDriveAccessToken(async (accessToken) => {
    const isAccountMatch =
      !config.accountEmail || config.accountEmail === currentUser?.email;
    const preferredFileId =
      explicitFileId ?? (isAccountMatch ? config.fileId : null);

    resolvedMetadata =
      (await getGoogleDriveQuickSyncFileMetadata(accessToken, preferredFileId)) ??
      (await resolveGoogleDriveQuickSyncBackupFile(accessToken));

    if (!resolvedMetadata) {
      throw new Error("No Quick Sync backup found on Google Drive.");
    }

    return downloadGoogleDriveBackupFile(accessToken, resolvedMetadata.id);
  });

  const backup = await readDatabaseBackup(archive, null);
  await replaceDatabaseFromSnapshot(backup.database);
  finalizeRestoredWorkspace();

  const restoredFile = resolvedMetadata as GoogleDriveQuickSyncMetadata | null;
  if (restoredFile) {
    saveQuickSyncConfig({
      enabled: true,
      network: config.network,
      fileId: restoredFile.id,
      accountEmail: currentUser?.email ?? null,
      lastSyncedAt: restoredFile.modifiedTime ?? new Date().toISOString(),
    });
    updateQuickSyncDeviceMetadata({
      lastKnownRemoteSyncId: restoredFile.syncRevisionId,
      lastKnownRemoteHeadRevisionId: restoredFile.headRevisionId,
      lastKnownRemoteVersion: restoredFile.version,
      lastKnownRemoteModifiedTime: restoredFile.modifiedTime,
      lastKnownRemoteFileId: restoredFile.id,
      hasUnsyncedLocalChanges: false,
    });
  }

  clearQuickSyncRemoteConflict();
  setQuickSyncRuntimeStatus("synced");

  const restoredAt = backup.createdAt.toLocaleString();
  restoreNotice = `Quick Sync backup from ${restoredAt} restored successfully.`;
  setTimeout(announceDatabaseReplacement, 0);
}

export function consumeRestoreNotice(): string | null {
  const notice = restoreNotice;
  restoreNotice = null;
  return notice;
}
