import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";

let isHandlerConfigured = false;

export function configureNotificationHandler(): void {
  if (isHandlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  isHandlerConfigured = true;
}

export async function checkNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    return (
      settings.granted ||
      settings.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    );
  } catch (error) {
    console.warn("[Notifications] Failed to check permissions:", error);
    return false;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const settings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return (
      settings.granted ||
      settings.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    );
  } catch (error) {
    console.warn("[Notifications] Failed to request permissions:", error);
    return false;
  }
}

export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn("[Notifications] Failed to open system settings:", error);
  }
}
