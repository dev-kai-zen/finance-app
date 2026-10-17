import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { getCreditCardMonitoring } from "@/modules/credit-cards";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_IDENTIFIERS,
} from "../constants/reminder-settings.constants";
import type { NotificationPayloadData } from "../types/notification.types";

export async function scheduleBillReminders(
  enabled: boolean,
  timeString: string,
  leadDays: number[],
  now = new Date(),
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    // 1. Cancel existing credit card bill reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existingCcReminders = scheduled.filter((item) =>
      item.identifier.startsWith(NOTIFICATION_IDENTIFIERS.CC_PREFIX),
    );

    for (const item of existingCcReminders) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }

    if (!enabled || leadDays.length === 0) return;

    const parts = timeString.split(":");
    const hour = Number.parseInt(parts[0] || "9", 10);
    const minute = Number.parseInt(parts[1] || "0", 10);

    const monitoring = getCreditCardMonitoring(now);
    const windowEndMs = now.getTime() + 30 * 24 * 60 * 60 * 1000; // 30-day scheduling horizon

    for (const card of monitoring.cards) {
      for (const statement of card.statements) {
        if (statement.remainingAmountMinorUnits <= 0) continue;
        if (!statement.dueOn) continue;

        // Parse dueOn "YYYY-MM-DD" in local time
        const [yearStr, monthStr, dayStr] = statement.dueOn.split("-");
        const dueYear = Number.parseInt(yearStr, 10);
        const dueMonth = Number.parseInt(monthStr, 10) - 1;
        const dueDay = Number.parseInt(dayStr, 10);

        if (Number.isNaN(dueYear) || Number.isNaN(dueMonth) || Number.isNaN(dueDay)) {
          continue;
        }

        for (const offset of leadDays) {
          const alertDate = new Date(
            dueYear,
            dueMonth,
            dueDay - offset,
            hour,
            minute,
            0,
            0,
          );

          const alertTimeMs = alertDate.getTime();
          if (alertTimeMs <= now.getTime() || alertTimeMs > windowEndMs) {
            continue;
          }

          const identifier = `${NOTIFICATION_IDENTIFIERS.CC_PREFIX}${card.accountId}_${statement.dueOn}_${offset}`;
          const dueText =
            offset === 0
              ? "due today"
              : offset === 1
                ? "due tomorrow"
                : `due in ${offset} days`;

          const data: NotificationPayloadData = {
            type: "credit-cards",
            url: "/credit-cards",
          };

          await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: `Credit Card Bill Reminder`,
              body: `${card.accountName} payment is ${dueText}.`,
              sound: true,
              data: data as unknown as Record<string, unknown>,
              categoryIdentifier: "bill",
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: alertDate,
              channelId: NOTIFICATION_CHANNELS.DUE_DATES.id,
            },
          });
        }
      }
    }
  } catch (error) {
    console.warn("[Notifications] Failed to schedule credit card bill reminders:", error);
  }
}
