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
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelResumeSchedule: (() => void) | null = null;

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          cancelResumeSchedule = scheduleAfterInteractions(() => syncAllReminders());
        }, 1500);
      } else {
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
        if (cancelResumeSchedule) {
          cancelResumeSchedule();
          cancelResumeSchedule = null;
        }
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
      if (resumeTimer) clearTimeout(resumeTimer);
      if (cancelResumeSchedule) cancelResumeSchedule();
      appStateSub.remove();
      unsubscribeResponses();
    };
  }, [router]);

  return null;
}
