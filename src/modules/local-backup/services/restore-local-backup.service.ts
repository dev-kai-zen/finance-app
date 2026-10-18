import {
  announceDatabaseReplacement,
  replaceDatabaseFromSnapshot,
} from "@/infrastructure/database";
import { finalizeRestoredWorkspace } from "@/modules/onboarding";
import { readLocalBackupFile } from "@/modules/local-backup/repositories/local-backup-files.repository";
import { readDatabaseBackup } from "@/modules/local-backup/utils/backup-format";
import { createLocalBackup } from "./create-local-backup.service";

let restoreNotice: string | null = null;

export async function restoreLocalBackup(
  uri: string,
  passphrase: string | null,
): Promise<void> {
  const archive = await readLocalBackupFile(uri);
  const backup = await readDatabaseBackup(archive, passphrase);

  await createLocalBackup(null, "safety");
  await replaceDatabaseFromSnapshot(backup.database);
  finalizeRestoredWorkspace();

  restoreNotice = `Backup from ${backup.createdAt.toLocaleString()} restored successfully. A pre-restore safety copy was saved.`;
  setTimeout(announceDatabaseReplacement, 0);
}

export function consumeLocalRestoreNotice(): string | null {
  const notice = restoreNotice;
  restoreNotice = null;
  return notice;
}
