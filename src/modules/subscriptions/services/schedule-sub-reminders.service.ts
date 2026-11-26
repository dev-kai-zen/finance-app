import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { formatCurrency } from "@/utils/currency";
import { listSubscriptions } from "../repositories/subscriptions.repository";

export const NOTIFICATION_SUB_PREFIX = "reminder-sub-";

export async function scheduleSubscriptionReminders(
  now = new Date(),
  timeString = "09:00",
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.filter((item) =>
      item.identifier.startsWith(NOTIFICATION_SUB_PREFIX),
    );

    for (const item of existing) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }

    const subs = listSubscriptions();
    const activeSubs = subs.filter(
      (s) => s.status === "active" || s.status === "trial",
    );

    if (activeSubs.length === 0) return;

    const parts = timeString.split(":");
    const hour = Number.parseInt(parts[0] || "9", 10);
    const minute = Number.parseInt(parts[1] || "0", 10);

    const windowEndMs = now.getTime() + 30 * 24 * 60 * 60 * 1000; // 30 days ahead

    for (const sub of activeSubs) {
      const targetDate =
        sub.status === "trial" && sub.trialEndsAt
          ? sub.trialEndsAt
          : sub.nextRenewalDate;
      const dueYear = targetDate.getFullYear();
      const dueMonth = targetDate.getMonth();
      const dueDay = targetDate.getDate();

      const leadDays = sub.reminderLeadDays.length > 0 ? sub.reminderLeadDays : [1];

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

        const identifier = `${NOTIFICATION_SUB_PREFIX}${sub.id}_${offset}`;
        const isTrial = sub.status === "trial";
        const costStr = formatCurrency(
          sub.amountMinorUnits,
          sub.currencyCode,
        );

        const dueText =
          offset === 0
            ? "today"
            : offset === 1
              ? "tomorrow"
              : `in ${offset} days`;

        const title = isTrial
          ? `Free Trial Ending: ${sub.name}`
          : `Subscription Renewal: ${sub.name}`;

        const body = isTrial
          ? `${sub.name} trial ends ${dueText}. Renewing at ${costStr}.`
          : `${sub.name} renews ${dueText} (${costStr}).`;

        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title,
            body,
            sound: true,
            data: {
              type: "subscriptions",
              url: "/subscriptions",
            },
            categoryIdentifier: "bill",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alertDate,
            channelId: "due-dates-channel",
          },
        });
      }
    }
  } catch (error) {
    console.warn("[Subscriptions] Failed to schedule reminders:", error);
  }
}
