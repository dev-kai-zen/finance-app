import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { NOTIFICATION_CHANNELS } from "../constants/reminder-settings.constants";

export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync(
      NOTIFICATION_CHANNELS.REMINDERS.id,
      {
        name: NOTIFICATION_CHANNELS.REMINDERS.name,
        description: NOTIFICATION_CHANNELS.REMINDERS.description,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#11231E",
      },
    );

    await Notifications.setNotificationChannelAsync(
      NOTIFICATION_CHANNELS.DUE_DATES.id,
      {
        name: NOTIFICATION_CHANNELS.DUE_DATES.name,
        description: NOTIFICATION_CHANNELS.DUE_DATES.description,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#11231E",
      },
    );
  } catch (error) {
    console.warn("[Notifications] Failed to set up notification channels:", error);
  }
}
