import type { AutomaticBackupFrequency } from "@/modules/local-backup/types/backup.types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function isAutomaticBackupDue(
  latestBackupAt: Date | null,
  frequency: AutomaticBackupFrequency,
  now = new Date(),
): boolean {
  if (!latestBackupAt) return true;
  const interval = frequency === "weekly" ? 7 * DAY_MS : DAY_MS;
  return now.getTime() - latestBackupAt.getTime() >= interval;
}
