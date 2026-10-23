import { queueDebouncedQuickSync } from "@/infrastructure/sync";
import type { GoogleDriveScheduledBackupConfig } from "@/modules/google-drive-backup/types/google-drive-backup.types";
import { getCurrentProStatus } from "@/modules/pro";
import { saveGoogleDriveScheduledBackupConfig } from "../repositories/google-drive-scheduled-backup-settings.repository";
import { runGoogleDriveScheduledBackupIfDue } from "./run-google-drive-scheduled-backup-if-due.service";

export async function configureGoogleDriveScheduledBackup(
  config: GoogleDriveScheduledBackupConfig,
): Promise<void> {
  const isPro = getCurrentProStatus().isPro;
  const effectiveConfig = !isPro ? { ...config, enabled: false } : config;
  saveGoogleDriveScheduledBackupConfig(effectiveConfig);
  queueDebouncedQuickSync();
  if (effectiveConfig.enabled) {
    await runGoogleDriveScheduledBackupIfDue();
  }
}
