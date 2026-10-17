import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { NOTIFICATION_CHANNELS } from "../constants/reminder-settings.constants";
import { ensureNotificationChannels } from "./notification-channels.service";
import {
  checkNotificationPermissions,
  requestNotificationPermissions,
} from "./notification-permissions.service";
import type { NotificationPayloadData } from "../types/notification.types";

export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    let hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      hasPermission = await requestNotificationPermissions();
      if (!hasPermission) return false;
    }

    await ensureNotificationChannels();

    const data: NotificationPayloadData = {
      type: "test",
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Reminder Notification",
        body: "Reminders and notifications are working properly on your device!",
        sound: true,
        data: data as unknown as Record<string, unknown>,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
        channelId: NOTIFICATION_CHANNELS.REMINDERS.id,
      },
    });

    return true;
  } catch (error) {
    console.warn("[Notifications] Failed to send test notification:", error);
    return false;
  }
}
