import {
  saveAutomaticBackupConfig,
} from "@/modules/backup/repositories/local-backup-settings.repository";
import type { AutomaticBackupConfig } from "@/modules/backup/types/backup.types";
import { runAutomaticLocalBackupIfDue } from "./automatic-local-backup.service";

export async function configureAutomaticLocalBackup(
  config: AutomaticBackupConfig,
): Promise<void> {
  saveAutomaticBackupConfig(config);
  if (config.enabled) await runAutomaticLocalBackupIfDue();
}
