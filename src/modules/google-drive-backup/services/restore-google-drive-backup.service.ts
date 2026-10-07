import {
  announceDatabaseReplacement,
  replaceDatabaseFromSnapshot,
} from "@/infrastructure/database";
import { downloadGoogleDriveBackupFile } from "@/infrastructure/sync";
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

export function consumeRestoreNotice(): string | null {
  const notice = restoreNotice;
  restoreNotice = null;
  return notice;
}
