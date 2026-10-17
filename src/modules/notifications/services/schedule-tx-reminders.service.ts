import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { getCalendarScheduleOccurrences } from "@/modules/scheduled-transactions";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_IDENTIFIERS,
} from "../constants/reminder-settings.constants";
import type { NotificationPayloadData } from "../types/notification.types";

export async function scheduleTxReminders(
  enabled: boolean,
  timeString: string,
  leadDays: number[],
  now = new Date(),
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    // 1. Cancel existing scheduled transaction reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existingTxReminders = scheduled.filter((item) =>
      item.identifier.startsWith(NOTIFICATION_IDENTIFIERS.SCHED_TX_PREFIX),
    );

    for (const item of existingTxReminders) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }

    if (!enabled || leadDays.length === 0) return;

    const parts = timeString.split(":");
    const hour = Number.parseInt(parts[0] || "9", 10);
    const minute = Number.parseInt(parts[1] || "0", 10);

    const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const occurrences = getCalendarScheduleOccurrences({
      startDate: now,
      endDate: windowEnd,
    });

    const activeOccurrences = occurrences.filter(
      (occ) => occ.status === "upcoming" || occ.status === "due",
    );

    const windowEndMs = windowEnd.getTime();

    for (const occ of activeOccurrences) {
      const targetDate = occ.effectiveDueAt ?? occ.nominalDueAt;
      const dueYear = targetDate.getFullYear();
      const dueMonth = targetDate.getMonth();
      const dueDay = targetDate.getDate();

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

        const identifier = `${NOTIFICATION_IDENTIFIERS.SCHED_TX_PREFIX}${occ.scheduleId}_${occ.sequenceNumber}_${offset}`;
        const dueText =
          offset === 0
            ? "today"
            : offset === 1
              ? "tomorrow"
              : `in ${offset} days`;

        const data: NotificationPayloadData = {
          type: "scheduled-transactions",
          url: "/calendar",
        };

        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: `Scheduled Transaction Reminder`,
            body: `${occ.scheduleName} is scheduled for ${dueText}.`,
            sound: true,
            data: data as unknown as Record<string, unknown>,
            categoryIdentifier: "schedule",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alertDate,
            channelId: NOTIFICATION_CHANNELS.DUE_DATES.id,
          },
        });
      }
    }
  } catch (error) {
    console.warn(
      "[Notifications] Failed to schedule transaction reminders:",
      error,
    );
  }
}
