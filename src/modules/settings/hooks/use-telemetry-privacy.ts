import { useCallback, useEffect, useState } from "react";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import {
  getTelemetryPrivacySettings,
  setCrashReportsSetting,
  setUsageAnalyticsSetting,
  subscribeToTelemetrySettings,
} from "../services/telemetry-settings.service";
import type { TelemetryPrivacyPreferences } from "@/infrastructure/telemetry";

export function useTelemetryPrivacy() {
  const [preferences, setPreferences] = useState<TelemetryPrivacyPreferences>(() =>
    getTelemetryPrivacySettings(),
  );

  useEffect(() => {
    return subscribeToTelemetrySettings((nextPrefs) => {
      setPreferences(nextPrefs);
    });
  }, []);

  const setUsageAnalytics = useCallback(
    (enabled: boolean, onComplete?: () => void) => {
      setPreferences((prev) => ({ ...prev, usageAnalyticsEnabled: enabled }));
      scheduleAfterPaint(() => {
        setUsageAnalyticsSetting(enabled);
        requestAnimationFrame(() => {
          onComplete?.();
        });
      });
    },
    [],
  );

  const setCrashReports = useCallback(
    (enabled: boolean, onComplete?: () => void) => {
      setPreferences((prev) => ({ ...prev, crashReportsEnabled: enabled }));
      scheduleAfterPaint(() => {
        setCrashReportsSetting(enabled);
        requestAnimationFrame(() => {
          onComplete?.();
        });
      });
    },
    [],
  );

  return {
    usageAnalyticsEnabled: preferences.usageAnalyticsEnabled,
    crashReportsEnabled: preferences.crashReportsEnabled,
    setUsageAnalytics,
    setCrashReports,
  };
}
