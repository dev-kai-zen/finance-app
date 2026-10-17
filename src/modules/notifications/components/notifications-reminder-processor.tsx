import { useEffect } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import { syncAllReminders } from "../services/sync-all-reminders.service";
import { subscribeToNotificationResponses } from "../services/notification-navigation.service";

export function NotificationsReminderProcessor() {
  const router = useRouter();

  useEffect(() => {
    // 1. Initial reminder synchronization
    syncAllReminders();

    // 2. Refresh reminders whenever app comes to foreground
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncAllReminders();
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
      appStateSub.remove();
      unsubscribeResponses();
    };
  }, [router]);

  return null;
}
