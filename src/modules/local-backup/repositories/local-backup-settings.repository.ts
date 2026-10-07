import { inArray } from "drizzle-orm";

import { db } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import type {
  AutomaticBackupConfig,
  AutomaticBackupFrequency,
} from "@/modules/local-backup/types/backup.types";

const AUTOMATIC_BACKUP_ENABLED_KEY = "local_backup_automatic_enabled";
const AUTOMATIC_BACKUP_FREQUENCY_KEY = "local_backup_automatic_frequency";
const AUTOMATIC_BACKUP_KEYS = [
  AUTOMATIC_BACKUP_ENABLED_KEY,
  AUTOMATIC_BACKUP_FREQUENCY_KEY,
];

export function getAutomaticBackupConfig(): AutomaticBackupConfig {
  const rows = db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, AUTOMATIC_BACKUP_KEYS))
    .all();
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]));

  return {
    enabled: values[AUTOMATIC_BACKUP_ENABLED_KEY] === "true",
    frequency: normalizeFrequency(
      values[AUTOMATIC_BACKUP_FREQUENCY_KEY],
    ),
  };
}

export function saveAutomaticBackupConfig(
  config: AutomaticBackupConfig,
): void {
  const updatedAt = new Date();
  const entries = {
    [AUTOMATIC_BACKUP_ENABLED_KEY]: String(config.enabled),
    [AUTOMATIC_BACKUP_FREQUENCY_KEY]: config.frequency,
  };

  Object.entries(entries).forEach(([key, value]) => {
    db.insert(settings)
      .values({ key, value, updatedAt })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt },
      })
      .run();
  });
}

function normalizeFrequency(value: string | undefined): AutomaticBackupFrequency {
  return value === "weekly" ? "weekly" : "daily";
}
