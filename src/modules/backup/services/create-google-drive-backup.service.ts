import { uploadGoogleDriveBackupFile } from "@/infrastructure/sync";
import type { BackupFile } from "@/modules/backup/types/backup.types";
import { createBackupArchive } from "./create-backup-archive.service";
import { withGoogleDriveAccessToken } from "./google-drive-auth.service";

export async function createGoogleDriveBackup(
  passphrase: string | null,
): Promise<BackupFile> {
  const archive = await createBackupArchive(passphrase);

  return withGoogleDriveAccessToken((accessToken) =>
    uploadGoogleDriveBackupFile(
      accessToken,
      archive.bytes,
      archive.createdAt,
      passphrase !== null,
    ),
  );
}
