import {
  saveAutomaticBackupConfig,
} from "@/modules/local-backup/repositories/local-backup-settings.repository";
import type { AutomaticBackupConfig } from "@/modules/local-backup/types/backup.types";
import { getCurrentProStatus } from "@/modules/pro";
import { runAutomaticLocalBackupIfDue } from "./automatic-local-backup.service";

export async function configureAutomaticLocalBackup(
  config: AutomaticBackupConfig,
): Promise<void> {
  const isPro = getCurrentProStatus().isPro;
  const effectiveConfig = !isPro ? { ...config, enabled: false } : config;
  saveAutomaticBackupConfig(effectiveConfig);
  if (effectiveConfig.enabled) await runAutomaticLocalBackupIfDue();
}
