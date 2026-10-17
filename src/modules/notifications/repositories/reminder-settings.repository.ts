import { inArray } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import {
  DEFAULT_REMINDER_SETTINGS,
  REMINDER_SETTINGS_KEYS,
} from "../constants/reminder-settings.constants";
import type { ReminderSettings } from "../types/notification.types";

export function getReminderSettings(context: DbContext = db): ReminderSettings {
  const keys = Object.values(REMINDER_SETTINGS_KEYS);
  const rows = context
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys))
    .all();

  const map = new Map<string, string>(rows.map((r) => [r.key, r.value]));

  const parseBoolean = (val: string | undefined, fallback: boolean): boolean => {
    if (val === undefined) return fallback;
    return val === "true" || val === "1";
  };

  const parseJsonArray = (val: string | undefined, fallback: number[]): number[] => {
    if (!val) return fallback;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((n) => Number(n)).filter((n) => !Number.isNaN(n));
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  return {
    dailyReminderEnabled: parseBoolean(
      map.get(REMINDER_SETTINGS_KEYS.DAILY_ENABLED),
      DEFAULT_REMINDER_SETTINGS.dailyReminderEnabled,
    ),
    dailyReminderTime:
      map.get(REMINDER_SETTINGS_KEYS.DAILY_TIME) ||
      DEFAULT_REMINDER_SETTINGS.dailyReminderTime,
    creditCardsReminderEnabled: parseBoolean(
      map.get(REMINDER_SETTINGS_KEYS.CREDIT_CARDS_ENABLED),
      DEFAULT_REMINDER_SETTINGS.creditCardsReminderEnabled,
    ),
    creditCardsReminderTime:
      map.get(REMINDER_SETTINGS_KEYS.CREDIT_CARDS_TIME) ||
      DEFAULT_REMINDER_SETTINGS.creditCardsReminderTime,
    creditCardsLeadDays: parseJsonArray(
      map.get(REMINDER_SETTINGS_KEYS.CREDIT_CARDS_LEAD_DAYS),
      DEFAULT_REMINDER_SETTINGS.creditCardsLeadDays,
    ),
    scheduledTransactionsReminderEnabled: parseBoolean(
      map.get(REMINDER_SETTINGS_KEYS.SCHEDULED_TRANSACTIONS_ENABLED),
      DEFAULT_REMINDER_SETTINGS.scheduledTransactionsReminderEnabled,
    ),
    scheduledTransactionsReminderTime:
      map.get(REMINDER_SETTINGS_KEYS.SCHEDULED_TRANSACTIONS_TIME) ||
      DEFAULT_REMINDER_SETTINGS.scheduledTransactionsReminderTime,
    scheduledTransactionsLeadDays: parseJsonArray(
      map.get(REMINDER_SETTINGS_KEYS.SCHEDULED_TRANSACTIONS_LEAD_DAYS),
      DEFAULT_REMINDER_SETTINGS.scheduledTransactionsLeadDays,
    ),
  };
}

export function saveReminderSettings(
  updated: Partial<ReminderSettings>,
  context: DbContext = db,
  now = new Date(),
): void {
  const entries: [string, string][] = [];

  if (updated.dailyReminderEnabled !== undefined) {
    entries.push([
      REMINDER_SETTINGS_KEYS.DAILY_ENABLED,
      String(updated.dailyReminderEnabled),
    ]);
  }
  if (updated.dailyReminderTime !== undefined) {
    entries.push([
      REMINDER_SETTINGS_KEYS.DAILY_TIME,
      updated.dailyReminderTime,
    ]);
  }
  if (updated.creditCardsReminderEnabled !== undefined) {
    entries.push([
      REMINDER_SETTINGS_KEYS.CREDIT_CARDS_ENABLED,
      String(updated.creditCardsReminderEnabled),
    ]);
  }
  if (updated.creditCardsReminderTime !== undefined) {
    entries.push([
      REMINDER_SETTINGS_KEYS.CREDIT_CARDS_TIME,
      updated.creditCardsReminderTime,
    ]);
  }
  if (updated.creditCardsLeadDays !== undefined) {
    entries.push([
      REMINDER_SETTINGS_KEYS.CREDIT_CARDS_LEAD_DAYS,
      JSON.stringify(updated.creditCardsLeadDays),
    ]);
  }
  if (updated.scheduledTransactionsReminderEnabled !== undefined) {
    entries.push([
      REMINDER_SETTINGS_KEYS.SCHEDULED_TRANSACTIONS_ENABLED,
      String(updated.scheduledTransactionsReminderEnabled),
    ]);
  }
  if (updated.scheduledTransactionsReminderTime !== undefined) {
    entries.push([
      REMINDER_SETTINGS_KEYS.SCHEDULED_TRANSACTIONS_TIME,
      updated.scheduledTransactionsReminderTime,
    ]);
  }
  if (updated.scheduledTransactionsLeadDays !== undefined) {
    entries.push([
      REMINDER_SETTINGS_KEYS.SCHEDULED_TRANSACTIONS_LEAD_DAYS,
      JSON.stringify(updated.scheduledTransactionsLeadDays),
    ]);
  }

  for (const [key, value] of entries) {
    context
      .insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: now },
      })
      .run();
  }
}
