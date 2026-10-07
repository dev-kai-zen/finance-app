import { prepareGoogleDriveBackupCatalog } from "@/infrastructure/sync";
import type { BackupCatalog } from "@/modules/google-drive-backup/types/google-drive-backup.types";
import { withGoogleDriveAccessToken } from "./google-drive-auth.service";

export function listGoogleDriveBackups(): Promise<BackupCatalog> {
  return withGoogleDriveAccessToken(prepareGoogleDriveBackupCatalog);
}
