import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_IDENTIFIERS,
} from "../constants/reminder-settings.constants";
import type { NotificationPayloadData } from "../types/notification.types";

export async function scheduleMonthlySummary(
  enabled: boolean,
  timeString: string,
  now = new Date(),
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      NOTIFICATION_IDENTIFIERS.MONTHLY_SUMMARY,
    );

    if (!enabled) return;

    const parts = timeString.split(":");
    const hour = Number.parseInt(parts[0] || "10", 10);
    const minute = Number.parseInt(parts[1] || "0", 10);

    // Determine the next 1st of the month
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      hour,
      minute,
      0,
      0,
    );

    // If already past 1st of this month at given time, advance to 1st of next month
    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }

    // Compute previous month name for the message
    const previousMonthDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() - 1,
      1,
    );
    const monthName = previousMonthDate.toLocaleString("en-US", {
      month: "long",
    });

    const data: NotificationPayloadData = {
      type: "reports",
      url: "/reports",
    };

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDENTIFIERS.MONTHLY_SUMMARY,
      content: {
        title: "Monthly Financial Summary",
        body: `Your ${monthName} Financial Summary is ready. See your savings and top spending categories!`,
        sound: true,
        data: data as unknown as Record<string, unknown>,
        categoryIdentifier: "summary",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        channelId: NOTIFICATION_CHANNELS.REMINDERS.id,
      },
    });
  } catch (error) {
    console.warn(
      "[Notifications] Failed to schedule monthly summary reminder:",
      error,
    );
  }
}
