import { prepareGoogleDriveBackupCatalog } from "@/infrastructure/sync";
import type { BackupCatalog } from "@/modules/backup/types/backup.types";
import { withGoogleDriveAccessToken } from "./google-drive-auth.service";

export function listGoogleDriveBackups(): Promise<BackupCatalog> {
  return withGoogleDriveAccessToken(prepareGoogleDriveBackupCatalog);
}
