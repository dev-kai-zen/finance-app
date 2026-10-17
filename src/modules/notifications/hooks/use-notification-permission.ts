import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  checkNotificationPermissions,
  openNotificationSettings,
  requestNotificationPermissions,
} from "../services/notification-permissions.service";

export function useNotificationPermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const refreshPermission = useCallback(async () => {
    const granted = await checkNotificationPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  useEffect(() => {
    refreshPermission();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermission]);

  const request = useCallback(async () => {
    const granted = await requestNotificationPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  return {
    hasPermission,
    refreshPermission,
    requestPermission: request,
    openSettings: openNotificationSettings,
  };
}
