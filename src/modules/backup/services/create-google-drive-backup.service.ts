import Constants from "expo-constants";

import { createDatabaseSnapshot } from "@/infrastructure/database";
import { uploadGoogleDriveBackupFile } from "@/infrastructure/sync";
import type { BackupFile } from "@/modules/backup/types/backup.types";
import { encryptDatabaseBackup } from "@/modules/backup/utils/backup-format";
import { withGoogleDriveAccessToken } from "./google-drive-auth.service";

export async function createGoogleDriveBackup(
  passphrase: string,
): Promise<BackupFile> {
  const createdAt = new Date();
  const snapshot = await createDatabaseSnapshot();
  const archive = await encryptDatabaseBackup(
    snapshot,
    passphrase,
    Constants.expoConfig?.version ?? "unknown",
    createdAt,
  );

  return withGoogleDriveAccessToken((accessToken) =>
    uploadGoogleDriveBackupFile(accessToken, archive, createdAt),
  );
}
