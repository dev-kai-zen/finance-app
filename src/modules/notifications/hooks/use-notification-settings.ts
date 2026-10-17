import { useCallback, useEffect, useState } from "react";
import {
  getReminderSettings,
  saveReminderSettings,
} from "../repositories/reminder-settings.repository";
import { syncAllReminders } from "../services/sync-all-reminders.service";
import {
  checkNotificationPermissions,
  requestNotificationPermissions,
} from "../services/notification-permissions.service";
import type { ReminderSettings } from "../types/notification.types";

export function useNotificationSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(() =>
    getReminderSettings(),
  );

  useEffect(() => {
    setSettings(getReminderSettings());
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof ReminderSettings>(
      key: K,
      value: ReminderSettings[K],
    ) => {
      // If turning on a reminder, ensure permissions are requested
      if (
        (key === "dailyReminderEnabled" ||
          key === "creditCardsReminderEnabled" ||
          key === "scheduledTransactionsReminderEnabled") &&
        value === true
      ) {
        const hasPermission = await checkNotificationPermissions();
        if (!hasPermission) {
          const granted = await requestNotificationPermissions();
          if (!granted) {
            // Permission denied, do not enable
            return false;
          }
        }
      }

      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveReminderSettings({ [key]: value });
        syncAllReminders(next);
        return next;
      });

      return true;
    },
    [],
  );

  const toggleLeadDay = useCallback(
    (
      target: "creditCardsLeadDays" | "scheduledTransactionsLeadDays",
      day: number,
    ) => {
      setSettings((prev) => {
        const currentDays = prev[target];
        let nextDays: number[];
        if (currentDays.includes(day)) {
          // Keep at least one lead day selected
          if (currentDays.length === 1) return prev;
          nextDays = currentDays.filter((d) => d !== day);
        } else {
          nextDays = [...currentDays, day].sort((a, b) => a - b);
        }

        const next = { ...prev, [target]: nextDays };
        saveReminderSettings({ [target]: nextDays });
        syncAllReminders(next);
        return next;
      });
    },
    [],
  );

  return {
    settings,
    updateSetting,
    toggleLeadDay,
  };
}
