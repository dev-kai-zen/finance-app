import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { getGoalsWithProgress } from "@/modules/goals";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_IDENTIFIERS,
} from "../constants/reminder-settings.constants";
import type { NotificationPayloadData } from "../types/notification.types";

export async function scheduleGoalReminders(
  enabled: boolean,
  now = new Date(),
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existingGoalReminders = scheduled.filter((item) =>
      item.identifier.startsWith(NOTIFICATION_IDENTIFIERS.GOAL_DEADLINE_PREFIX),
    );

    for (const item of existingGoalReminders) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }

    if (!enabled) return;

    const { goals } = getGoalsWithProgress();
    const windowEndMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;

    for (const goal of goals) {
      if (goal.status !== "in_progress" || !goal.targetDate) continue;

      const targetDate = new Date(goal.targetDate);
      const alertDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate() - 7,
        9,
        0,
        0,
        0,
      );

      const alertTimeMs = alertDate.getTime();
      if (alertTimeMs <= now.getTime() || alertTimeMs > windowEndMs) {
        continue;
      }

      const identifier = `${NOTIFICATION_IDENTIFIERS.GOAL_DEADLINE_PREFIX}${goal.id}`;
      const data: NotificationPayloadData = {
        type: "goals",
        url: "/goals",
      };

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: "Savings Goal Deadline Approaching",
          body: `${goal.name} target deadline is in 7 days! You have reached ${Math.round(goal.progressPercentage)}% so far.`,
          sound: true,
          data: data as unknown as Record<string, unknown>,
          categoryIdentifier: "goal",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: alertDate,
          channelId: NOTIFICATION_CHANNELS.DUE_DATES.id,
        },
      });
    }
  } catch (error) {
    console.warn("[Notifications] Failed to schedule goal reminders:", error);
  }
}
