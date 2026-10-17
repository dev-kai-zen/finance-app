import { deferComponent, deferFunction } from "@/utils/deferred-module";

export const ReminderSettingsScreen = deferComponent(
  () => require("./screens/reminder-settings-screen").ReminderSettingsScreen,
  "ReminderSettingsScreen",
) as typeof import("./screens/reminder-settings-screen").ReminderSettingsScreen;

export const NotificationsReminderProcessor = deferComponent(
  () =>
    require("./components/notifications-reminder-processor")
      .NotificationsReminderProcessor,
  "NotificationsReminderProcessor",
) as typeof import("./components/notifications-reminder-processor").NotificationsReminderProcessor;

export const useNotificationSettings = deferFunction(
  () => require("./hooks/use-notification-settings").useNotificationSettings,
) as typeof import("./hooks/use-notification-settings").useNotificationSettings;

export const useNotificationPermission = deferFunction(
  () =>
    require("./hooks/use-notification-permission").useNotificationPermission,
) as typeof import("./hooks/use-notification-permission").useNotificationPermission;

export const syncAllReminders = deferFunction(
  () => require("./services/sync-all-reminders.service").syncAllReminders,
) as typeof import("./services/sync-all-reminders.service").syncAllReminders;

export const sendTestNotification = deferFunction(
  () => require("./services/send-test-notification.service").sendTestNotification,
) as typeof import("./services/send-test-notification.service").sendTestNotification;

export const checkAndNotifyBudgetThreshold = deferFunction(
  () =>
    require("./services/check-instant-alerts.service")
      .checkAndNotifyBudgetThreshold,
) as typeof import("./services/check-instant-alerts.service").checkAndNotifyBudgetThreshold;

export const checkAndNotifyCreditLimit = deferFunction(
  () =>
    require("./services/check-instant-alerts.service").checkAndNotifyCreditLimit,
) as typeof import("./services/check-instant-alerts.service").checkAndNotifyCreditLimit;

export const checkAndNotifyGoalMilestones = deferFunction(
  () =>
    require("./services/check-instant-alerts.service")
      .checkAndNotifyGoalMilestones,
) as typeof import("./services/check-instant-alerts.service").checkAndNotifyGoalMilestones;

export const scheduleMonthlySummary = deferFunction(
  () =>
    require("./services/schedule-monthly-summary.service").scheduleMonthlySummary,
) as typeof import("./services/schedule-monthly-summary.service").scheduleMonthlySummary;

export const scheduleGoalReminders = deferFunction(
  () =>
    require("./services/schedule-goal-reminders.service").scheduleGoalReminders,
) as typeof import("./services/schedule-goal-reminders.service").scheduleGoalReminders;

export const getReminderSettings = deferFunction(
  () =>
    require("./repositories/reminder-settings.repository").getReminderSettings,
) as typeof import("./repositories/reminder-settings.repository").getReminderSettings;

export const saveReminderSettings = deferFunction(
  () =>
    require("./repositories/reminder-settings.repository").saveReminderSettings,
) as typeof import("./repositories/reminder-settings.repository").saveReminderSettings;

export type {
  NotificationChannelId,
  NotificationPayloadData,
  ReminderSettings,
} from "./types/notification.types";

export {
  AVAILABLE_LEAD_DAYS,
  DEFAULT_REMINDER_SETTINGS,
  REMINDER_SETTINGS_KEYS,
} from "./constants/reminder-settings.constants";
