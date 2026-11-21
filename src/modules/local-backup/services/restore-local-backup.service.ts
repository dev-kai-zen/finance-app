import {
  announceDatabaseReplacement,
  replaceDatabaseFromSnapshot,
  setDatabaseReplacing,
} from "@/infrastructure/database";
import {
  cancelDebouncedQuickSync,
  withQuickSyncReplacement,
  clearQuickSyncRemoteBaselineOnManualRestore,
  clearQuickSyncRemoteConflict,
  saveQuickSyncConfig,
  setQuickSyncRuntimeStatus,
} from "@/infrastructure/sync";
import { finalizeRestoredWorkspace } from "@/modules/onboarding";
import { readLocalBackupFile } from "@/modules/local-backup/repositories/local-backup-files.repository";
import { readDatabaseBackup } from "@/modules/local-backup/utils/backup-format";
import { prepareBackupRestore, legacyAttachmentNotice } from "./backup-attachments.service";
import { createLocalBackup } from "./create-local-backup.service";

let restoreNotice: string | null = null;

export async function restoreLocalBackup(
  uri: string,
  passphrase: string | null,
): Promise<void> {
  return withQuickSyncReplacement(async (assertCurrent) => {
    let replacementStarted = false;
    try {
      const archive = await readLocalBackupFile(uri);
      const backup = await readDatabaseBackup(archive, passphrase);

      await createLocalBackup(null, "safety");
      const snapshot = await prepareBackupRestore(backup, assertCurrent);
      assertCurrent();
      setDatabaseReplacing(true);
      try {
        cancelDebouncedQuickSync();
        replacementStarted = true;
        await replaceDatabaseFromSnapshot(snapshot);
        assertCurrent();
        finalizeRestoredWorkspace();
        saveQuickSyncConfig({ lastSyncedAt: null });
        clearQuickSyncRemoteConflict();
        clearQuickSyncRemoteBaselineOnManualRestore();
        cancelDebouncedQuickSync();
      } finally {
        setDatabaseReplacing(false);
      }

      restoreNotice = `Backup from ${backup.createdAt.toLocaleString()} restored successfully. A pre-restore safety copy was saved.` + legacyAttachmentNotice(backup);
    } finally {
      if (replacementStarted) {
        try { assertCurrent(); } catch {
          // Do not revive the restored archive's connection settings after sign-out,
          // disable, or a newer replacement request. Still remount the changed DB.
          saveQuickSyncConfig({ enabled: false, lastSyncedAt: null });
          clearQuickSyncRemoteBaselineOnManualRestore();
          clearQuickSyncRemoteConflict();
          setQuickSyncRuntimeStatus("disabled");
        }
        setTimeout(announceDatabaseReplacement, 0);
      }
    }
  });
}

export function consumeLocalRestoreNotice(): string | null {
  const notice = restoreNotice;
  restoreNotice = null;
  return notice;
}
