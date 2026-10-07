import { uploadGoogleDriveBackupFile } from "@/infrastructure/sync";
import type { BackupFile } from "@/modules/google-drive-backup/types/google-drive-backup.types";
import { createBackupArchive } from "@/modules/local-backup";
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
