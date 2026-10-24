import { inArray } from "drizzle-orm";

import { db } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import type { AutomaticBackupConfig } from "@/modules/local-backup/types/backup.types";
import {
  DEFAULT_BACKUP_SCHEDULE,
  normalizeBackupScheduleDayOfMonth,
  normalizeBackupScheduleFrequency,
  normalizeBackupScheduleTime,
  normalizeBackupScheduleWeekday,
} from "@/utils/backup-schedule";

const AUTOMATIC_BACKUP_ENABLED_KEY = "local_backup_automatic_enabled";
const AUTOMATIC_BACKUP_FREQUENCY_KEY = "local_backup_automatic_frequency";
const AUTOMATIC_BACKUP_TIME_KEY = "local_backup_automatic_time";
const AUTOMATIC_BACKUP_WEEKDAY_KEY = "local_backup_automatic_weekday";
const AUTOMATIC_BACKUP_DAY_OF_MONTH_KEY = "local_backup_automatic_day_of_month";
const AUTOMATIC_BACKUP_KEYS = [
  AUTOMATIC_BACKUP_ENABLED_KEY,
  AUTOMATIC_BACKUP_FREQUENCY_KEY,
  AUTOMATIC_BACKUP_TIME_KEY,
  AUTOMATIC_BACKUP_WEEKDAY_KEY,
  AUTOMATIC_BACKUP_DAY_OF_MONTH_KEY,
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
    frequency: normalizeBackupScheduleFrequency(
      values[AUTOMATIC_BACKUP_FREQUENCY_KEY],
    ),
    timeOfDay: normalizeBackupScheduleTime(
      values[AUTOMATIC_BACKUP_TIME_KEY] ?? DEFAULT_BACKUP_SCHEDULE.timeOfDay,
    ),
    weekday: normalizeBackupScheduleWeekday(values[AUTOMATIC_BACKUP_WEEKDAY_KEY]),
    dayOfMonth: normalizeBackupScheduleDayOfMonth(
      values[AUTOMATIC_BACKUP_DAY_OF_MONTH_KEY],
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
    [AUTOMATIC_BACKUP_TIME_KEY]: normalizeBackupScheduleTime(config.timeOfDay),
    [AUTOMATIC_BACKUP_WEEKDAY_KEY]: String(
      normalizeBackupScheduleWeekday(config.weekday),
    ),
    [AUTOMATIC_BACKUP_DAY_OF_MONTH_KEY]: String(
      normalizeBackupScheduleDayOfMonth(config.dayOfMonth),
    ),
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
