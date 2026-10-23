import type { AutomaticBackupConfig } from "@/modules/local-backup/types/backup.types";
import { isScheduledBackupDue } from "@/utils/backup-schedule";

export function isAutomaticBackupDue(
  latestBackupAt: Date | null,
  config: Pick<
    AutomaticBackupConfig,
    "frequency" | "timeOfDay" | "weekday" | "dayOfMonth"
  >,
  now = new Date(),
): boolean {
  return isScheduledBackupDue(latestBackupAt, config, now);
}
