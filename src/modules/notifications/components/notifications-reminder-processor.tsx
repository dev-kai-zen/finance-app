import { useEffect } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";
import { syncAllReminders } from "../services/sync-all-reminders.service";
import { subscribeToNotificationResponses } from "../services/notification-navigation.service";

export function NotificationsReminderProcessor() {
  const router = useRouter();

  useEffect(() => {
    const cancelInitial = scheduleAfterInteractions(() => syncAllReminders());

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        scheduleAfterInteractions(() => syncAllReminders());
      }
    });

    // 3. Handle notification response taps
    const unsubscribeResponses = subscribeToNotificationResponses((route) => {
      try {
        router.push(route as any);
      } catch (error) {
        console.warn("[Notifications] Failed to navigate on notification tap:", error);
      }
    });

    return () => {
      cancelInitial();
      appStateSub.remove();
      unsubscribeResponses();
    };
  }, [router]);

  return null;
}
