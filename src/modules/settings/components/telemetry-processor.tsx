import { useEffect } from "react";
import Constants from "expo-constants";
import { logTelemetryEvent } from "@/infrastructure/telemetry";
import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";
import { initializeTelemetrySettings } from "../services/telemetry-settings.service";

export function TelemetryProcessor(): null {
  useEffect(() => {
    const cancel = scheduleAfterInteractions(() => {
      initializeTelemetrySettings();
      logTelemetryEvent("app_launched", {
        is_first_launch: false,
        app_version: Constants.expoConfig?.version ?? "1.6.1",
      });
    });

    return () => {
      cancel();
    };
  }, []);

  return null;
}
