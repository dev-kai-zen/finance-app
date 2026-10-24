import { inArray } from "drizzle-orm";

import { db } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import type { GoogleDriveScheduledBackupConfig } from "@/modules/google-drive-backup/types/google-drive-backup.types";
import {
  DEFAULT_BACKUP_SCHEDULE,
  normalizeBackupScheduleDayOfMonth,
  normalizeBackupScheduleFrequency,
  normalizeBackupScheduleTime,
  normalizeBackupScheduleWeekday,
} from "@/utils/backup-schedule";

const ENABLED_KEY = "gdrive_scheduled_backup_enabled";
const FREQUENCY_KEY = "gdrive_scheduled_backup_frequency";
const TIME_KEY = "gdrive_scheduled_backup_time";
const WEEKDAY_KEY = "gdrive_scheduled_backup_weekday";
const DAY_OF_MONTH_KEY = "gdrive_scheduled_backup_day_of_month";
const LAST_RUN_AT_KEY = "gdrive_scheduled_backup_last_run_at";

const CONFIG_KEYS = [
  ENABLED_KEY,
  FREQUENCY_KEY,
  TIME_KEY,
  WEEKDAY_KEY,
  DAY_OF_MONTH_KEY,
  LAST_RUN_AT_KEY,
];

export function getGoogleDriveScheduledBackupConfig(): GoogleDriveScheduledBackupConfig {
  const rows = db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, CONFIG_KEYS))
    .all();
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]));

  return {
    enabled: values[ENABLED_KEY] === "true",
    frequency: normalizeBackupScheduleFrequency(values[FREQUENCY_KEY]),
    timeOfDay: normalizeBackupScheduleTime(
      values[TIME_KEY] ?? DEFAULT_BACKUP_SCHEDULE.timeOfDay,
    ),
    weekday: normalizeBackupScheduleWeekday(values[WEEKDAY_KEY]),
    dayOfMonth: normalizeBackupScheduleDayOfMonth(values[DAY_OF_MONTH_KEY]),
  };
}

export function getGoogleDriveScheduledBackupLastRunAt(): Date | null {
  const rows = db
    .select({ value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [LAST_RUN_AT_KEY]))
    .all();
  const raw = rows[0]?.value;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function saveGoogleDriveScheduledBackupConfig(
  config: GoogleDriveScheduledBackupConfig,
): void {
  const updatedAt = new Date();
  const entries = {
    [ENABLED_KEY]: String(config.enabled),
    [FREQUENCY_KEY]: config.frequency,
    [TIME_KEY]: normalizeBackupScheduleTime(config.timeOfDay),
    [WEEKDAY_KEY]: String(normalizeBackupScheduleWeekday(config.weekday)),
    [DAY_OF_MONTH_KEY]: String(
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

export function saveGoogleDriveScheduledBackupLastRunAt(runAt: Date): void {
  const updatedAt = new Date();
  db.insert(settings)
    .values({
      key: LAST_RUN_AT_KEY,
      value: runAt.toISOString(),
      updatedAt,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: runAt.toISOString(), updatedAt },
    })
    .run();
}
