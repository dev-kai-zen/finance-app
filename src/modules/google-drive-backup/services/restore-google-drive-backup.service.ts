import {
  announceDatabaseReplacement,
  replaceDatabaseFromSnapshot,
  setDatabaseReplacing,
} from "@/infrastructure/database";
import {
  cancelDebouncedQuickSync,
  clearQuickSyncRemoteBaselineOnManualRestore,
  clearQuickSyncRemoteConflict,
  downloadGoogleDriveBackupFile,
  getGoogleDriveQuickSyncFileMetadata,
  getQuickSyncConfig,
  getQuickSyncDeviceMetadata,
  getQuickSyncLocalChangeGeneration,
  queueDebouncedQuickSync,
  createQuickSyncRevisionId,
  uploadOrUpdateGoogleDriveQuickSyncBackup,
  evaluateQuickSyncRemoteState,
  setQuickSyncRemoteConflict,
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
  setDatabaseReplacing(true);
  try {
    cancelDebouncedQuickSync();
    await replaceDatabaseFromSnapshot(backup.database);
    finalizeRestoredWorkspace();
    saveQuickSyncConfig({ lastSyncedAt: null });
    clearQuickSyncRemoteConflict();
    clearQuickSyncRemoteBaselineOnManualRestore();
    cancelDebouncedQuickSync();
  } finally {
    setDatabaseReplacing(false);
  }

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
    const preferredFileId = explicitFileId;

    resolvedMetadata =
      (await getGoogleDriveQuickSyncFileMetadata(accessToken, preferredFileId, true)) ??
      (await resolveGoogleDriveQuickSyncBackupFile(accessToken));

    if (!resolvedMetadata) {
      throw new Error("No Quick Sync backup found on Google Drive.");
    }

    return downloadGoogleDriveBackupFile(accessToken, resolvedMetadata.id);
  });

  const backup = await readDatabaseBackup(archive, null);
  setDatabaseReplacing(true);
  try {
    cancelDebouncedQuickSync();
    await replaceDatabaseFromSnapshot(backup.database);
    finalizeRestoredWorkspace();
  } finally {
    setDatabaseReplacing(false);
  }

  const restoredGeneration = getQuickSyncLocalChangeGeneration();
  {
    let restoredFile = resolvedMetadata as GoogleDriveQuickSyncMetadata | null;
    let publicationError: string | null = null;
    // Restoring a branch resolves only the tips observed when the user chose it.
    // A later concurrent branch remains a conflict, and all source bytes survive.
    if (restoredFile?.hasConcurrentRevisions) {
      const device = getQuickSyncDeviceMetadata();
      const parents = restoredFile.tipTokens;
      const revisionId = createQuickSyncRevisionId();
      try {
        restoredFile = await withGoogleDriveAccessToken(token =>
          uploadOrUpdateGoogleDriveQuickSyncBackup(token, archive, null, {
            deviceId: device.deviceId, syncRevisionId: revisionId, parentTokens: parents,
          }));
      } catch (error) {
        publicationError = error instanceof Error ? error.message : 'Could not publish the restored Quick Sync revision.';
      }
    }
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
        hasUnsyncedLocalChanges: getQuickSyncLocalChangeGeneration() !== restoredGeneration,
      });
    }

    clearQuickSyncRemoteConflict();
    if (publicationError) {
      clearQuickSyncRemoteBaselineOnManualRestore();
      setQuickSyncRuntimeStatus("error", publicationError);
    } else if (restoredFile?.hasConcurrentRevisions) {
      const evaluation = evaluateQuickSyncRemoteState(restoredFile.concurrentFile ?? restoredFile, {
        ...getQuickSyncDeviceMetadata(), fileId: restoredFile.id,
        lastSyncedAt: restoredFile.modifiedTime,
      });
      if (evaluation.status === "remote_ahead") setQuickSyncRemoteConflict(evaluation.conflict, { openPrompt: true });
    } else {
      setQuickSyncRuntimeStatus("synced");
    }
    cancelDebouncedQuickSync();
    if (getQuickSyncLocalChangeGeneration() !== restoredGeneration) {
      queueDebouncedQuickSync();
      if (!publicationError && !restoredFile?.hasConcurrentRevisions) setQuickSyncRuntimeStatus("idle");
    }
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
