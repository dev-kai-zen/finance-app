import { Platform } from "react-native";
import { getReminderSettings } from "../repositories/reminder-settings.repository";
import type { ReminderSettings } from "../types/notification.types";
import {
  checkAndNotifyCreditLimit,
  checkAndNotifyGoalMilestones,
} from "./check-instant-alerts.service";
import { ensureNotificationChannels } from "./notification-channels.service";
import {
  checkNotificationPermissions,
  configureNotificationHandler,
} from "./notification-permissions.service";
import { scheduleBillReminders } from "./schedule-bill-reminders.service";
import { scheduleDailyReminder } from "./schedule-daily-reminder.service";
import { scheduleGoalReminders } from "./schedule-goal-reminders.service";
import { scheduleMonthlySummary } from "./schedule-monthly-summary.service";
import { scheduleTxReminders } from "./schedule-tx-reminders.service";

let isSyncInProgress = false;

export async function syncAllReminders(
  providedSettings?: ReminderSettings,
  now = new Date(),
): Promise<void> {
  if (Platform.OS === "web") return;
  if (isSyncInProgress) return;

  isSyncInProgress = true;
  try {
    configureNotificationHandler();
    await ensureNotificationChannels();

    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    const currentSettings = providedSettings ?? getReminderSettings();

    await Promise.all([
      scheduleDailyReminder(
        currentSettings.dailyReminderEnabled,
        currentSettings.dailyReminderTime,
      ),
      scheduleMonthlySummary(
        currentSettings.monthlySummaryReminderEnabled,
        currentSettings.monthlySummaryReminderTime,
        now,
      ),
      scheduleBillReminders(
        currentSettings.creditCardsReminderEnabled,
        currentSettings.creditCardsReminderTime,
        currentSettings.creditCardsLeadDays,
        now,
      ),
      scheduleTxReminders(
        currentSettings.scheduledTransactionsReminderEnabled,
        currentSettings.scheduledTransactionsReminderTime,
        currentSettings.scheduledTransactionsLeadDays,
        now,
      ),
      scheduleGoalReminders(
        currentSettings.savingsGoalAlertsEnabled,
        now,
      ),
      checkAndNotifyCreditLimit(),
      checkAndNotifyGoalMilestones(),
    ]);
  } catch (error) {
    console.warn("[Notifications] Failed to sync all reminders:", error);
  } finally {
    isSyncInProgress = false;
  }
}
