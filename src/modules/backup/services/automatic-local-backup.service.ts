import type { LocalBackupFile } from "@/modules/backup/types/backup.types";
import {
  listLocalBackupFiles,
  pruneAutomaticLocalBackups,
} from "@/modules/backup/repositories/local-backup-files.repository";
import { getAutomaticBackupConfig } from "@/modules/backup/repositories/local-backup-settings.repository";
import { isAutomaticBackupDue } from "@/modules/backup/utils/automatic-backup-schedule";
import { createLocalBackup } from "./create-local-backup.service";

const AUTOMATIC_BACKUP_RETENTION = 7;

let activeAutomaticBackup: Promise<LocalBackupFile | null> | null = null;

export function runAutomaticLocalBackupIfDue(): Promise<LocalBackupFile | null> {
  if (activeAutomaticBackup) return activeAutomaticBackup;

  activeAutomaticBackup = performAutomaticBackup().finally(() => {
    activeAutomaticBackup = null;
  });
  return activeAutomaticBackup;
}

async function performAutomaticBackup(): Promise<LocalBackupFile | null> {
  const config = getAutomaticBackupConfig();
  if (!config.enabled) return null;

  const backups = await listLocalBackupFiles();
  const latestAutomatic = backups.find(({ kind, valid }) =>
    kind === "automatic" && valid,
  );
  if (
    latestAutomatic &&
    !isAutomaticBackupDue(latestAutomatic.createdAt, config.frequency)
  ) {
    return null;
  }

  const backup = await createLocalBackup(null, "automatic");
  await pruneAutomaticLocalBackups(AUTOMATIC_BACKUP_RETENTION);
  return backup;
}
