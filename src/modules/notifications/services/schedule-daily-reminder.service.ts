import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_IDENTIFIERS,
} from "../constants/reminder-settings.constants";
import type { NotificationPayloadData } from "../types/notification.types";

export async function scheduleDailyReminder(
  enabled: boolean,
  timeString: string,
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    // Always cancel existing daily reminder identifier
    await Notifications.cancelScheduledNotificationAsync(
      NOTIFICATION_IDENTIFIERS.DAILY_REMINDER,
    );

    if (!enabled) return;

    const parts = timeString.split(":");
    const hour = Number.parseInt(parts[0] || "20", 10);
    const minute = Number.parseInt(parts[1] || "0", 10);

    const data: NotificationPayloadData = {
      type: "new-transaction",
    };

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDENTIFIERS.DAILY_REMINDER,
      content: {
        title: "Daily Expense Reminder",
        body: "Take a moment to record your transactions and keep your finances up to date.",
        sound: true,
        data: data as unknown as Record<string, unknown>,
        categoryIdentifier: "reminder",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Number.isNaN(hour) ? 20 : hour,
        minute: Number.isNaN(minute) ? 0 : minute,
        channelId: NOTIFICATION_CHANNELS.REMINDERS.id,
      },
    });
  } catch (error) {
    console.warn("[Notifications] Failed to schedule daily reminder:", error);
  }
}
