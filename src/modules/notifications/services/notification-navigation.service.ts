import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { NotificationPayloadData } from "../types/notification.types";

export function subscribeToNotificationResponses(
  onNavigate: (route: string) => void,
): () => void {
  if (Platform.OS === "web") {
    return () => {};
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      try {
        const data = response.notification.request.content
          .data as unknown as NotificationPayloadData | undefined;

        if (!data) return;

        if (data.url) {
          onNavigate(data.url);
          return;
        }

        switch (data.type) {
          case "new-transaction":
            onNavigate("/transactions");
            break;
          case "credit-cards":
            onNavigate("/credit-cards");
            break;
          case "scheduled-transactions":
            onNavigate("/calendar");
            break;
          default:
            break;
        }
      } catch (error) {
        console.warn("[Notifications] Error handling notification response:", error);
      }
    },
  );

  return () => {
    subscription.remove();
  };
}
