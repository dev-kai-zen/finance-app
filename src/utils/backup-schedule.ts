export type BackupScheduleFrequency = "daily" | "weekly" | "monthly";

export interface BackupScheduleFields {
  frequency: BackupScheduleFrequency;
  /** Local wall-clock time in 24-hour "HH:mm" format. */
  timeOfDay: string;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** 1–28 (clamped; avoids month-end gaps). */
  dayOfMonth: number;
}

export const DEFAULT_BACKUP_SCHEDULE: BackupScheduleFields = {
  frequency: "daily",
  timeOfDay: "02:00",
  weekday: 0,
  dayOfMonth: 1,
};

export function normalizeBackupScheduleFrequency(
  value: string | undefined,
): BackupScheduleFrequency {
  if (value === "weekly" || value === "monthly") return value;
  return "daily";
}

export function normalizeBackupScheduleTime(value: string | undefined): string {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) {
    return DEFAULT_BACKUP_SCHEDULE.timeOfDay;
  }
  const [hourPart, minutePart] = value.split(":");
  const hour = Number.parseInt(hourPart ?? "2", 10);
  const minute = Number.parseInt(minutePart ?? "0", 10);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return DEFAULT_BACKUP_SCHEDULE.timeOfDay;
  }
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function normalizeBackupScheduleWeekday(value: number | string | undefined): number {
  const parsed =
    typeof value === "string" ? Number.parseInt(value, 10) : (value ?? 0);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 6) {
    return DEFAULT_BACKUP_SCHEDULE.weekday;
  }
  return parsed;
}

export function normalizeBackupScheduleDayOfMonth(
  value: number | string | undefined,
): number {
  const parsed =
    typeof value === "string" ? Number.parseInt(value, 10) : (value ?? 1);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 28) {
    return DEFAULT_BACKUP_SCHEDULE.dayOfMonth;
  }
  return parsed;
}

export function parseBackupScheduleTimeOfDay(timeOfDay: string): {
  hour: number;
  minute: number;
} {
  const normalized = normalizeBackupScheduleTime(timeOfDay);
  const [hourPart, minutePart] = normalized.split(":");
  return {
    hour: Number.parseInt(hourPart ?? "2", 10),
    minute: Number.parseInt(minutePart ?? "0", 10),
  };
}

export function formatBackupScheduleTimeDisplay(timeStr: string): string {
  const { hour, minute } = parseBackupScheduleTimeOfDay(timeStr);
  const period = hour >= 12 ? "PM" : "AM";
  const displayH = hour % 12 === 0 ? 12 : hour % 12;
  const displayM = minute < 10 ? `0${minute}` : `${minute}`;
  return `${displayH}:${displayM} ${period}`;
}

export const BACKUP_SCHEDULE_WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/** Most recent scheduled instant at or before `now`. */
export function getLatestPassedScheduleSlot(
  config: BackupScheduleFields,
  now = new Date(),
): Date {
  const { hour, minute } = parseBackupScheduleTimeOfDay(config.timeOfDay);

  if (config.frequency === "daily") {
    const slot = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0,
    );
    if (now.getTime() < slot.getTime()) {
      slot.setDate(slot.getDate() - 1);
    }
    return slot;
  }

  if (config.frequency === "weekly") {
    const targetWeekday = normalizeBackupScheduleWeekday(config.weekday);
    const currentWeekday = now.getDay();
    const daysBack = (currentWeekday - targetWeekday + 7) % 7;
    const slot = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysBack,
      hour,
      minute,
      0,
      0,
    );
    if (now.getTime() < slot.getTime()) {
      slot.setDate(slot.getDate() - 7);
    }
    return slot;
  }

  const day = normalizeBackupScheduleDayOfMonth(config.dayOfMonth);
  let slot = new Date(
    now.getFullYear(),
    now.getMonth(),
    day,
    hour,
    minute,
    0,
    0,
  );
  if (now.getTime() < slot.getTime()) {
    slot = new Date(now.getFullYear(), now.getMonth() - 1, day, hour, minute, 0, 0);
  }
  return slot;
}

export function isScheduledBackupDue(
  lastBackupAt: Date | null,
  config: BackupScheduleFields,
  now = new Date(),
): boolean {
  const slot = getLatestPassedScheduleSlot(config, now);
  if (now.getTime() < slot.getTime()) {
    return false;
  }
  if (!lastBackupAt) {
    return true;
  }
  return lastBackupAt.getTime() < slot.getTime();
}
