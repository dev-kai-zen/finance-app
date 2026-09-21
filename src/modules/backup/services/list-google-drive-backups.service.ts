import { listGoogleDriveBackupFiles } from "@/infrastructure/sync";
import type { BackupFile } from "@/modules/backup/types/backup.types";
import { withGoogleDriveAccessToken } from "./google-drive-auth.service";

export function listGoogleDriveBackups(): Promise<BackupFile[]> {
  return withGoogleDriveAccessToken(listGoogleDriveBackupFiles);
}
