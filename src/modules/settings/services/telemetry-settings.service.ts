import type { DbContext } from "@/infrastructure/database/client";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import {
  syncTelemetryConsent,
  type TelemetryPrivacyPreferences,
} from "@/infrastructure/telemetry";
import {
  CRASH_REPORTS_SETTING_KEY,
  USAGE_ANALYTICS_SETTING_KEY,
} from "../constants/settings.constants";
import {
  getSettingsByKey,
} from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

type TelemetrySettingsListener = (prefs: TelemetryPrivacyPreferences) => void;
const listeners = new Set<TelemetrySettingsListener>();

let cachedPreferences: TelemetryPrivacyPreferences | null = null;

subscribeToDatabaseReplacement(() => {
  cachedPreferences = null;
});

export function subscribeToTelemetrySettings(
  listener: TelemetrySettingsListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(prefs: TelemetryPrivacyPreferences): void {
  listeners.forEach((listener) => {
    try {
      listener(prefs);
    } catch {
      // Ignore
    }
  });
}

export function getTelemetryPrivacySettings(
  context?: DbContext,
): TelemetryPrivacyPreferences {
  if (cachedPreferences !== null && !context) {
    return cachedPreferences;
  }

  try {
    const entries = getSettingsByKey(
      [USAGE_ANALYTICS_SETTING_KEY, CRASH_REPORTS_SETTING_KEY],
      context,
    );

    const usageVal = entries[USAGE_ANALYTICS_SETTING_KEY];
    const crashVal = entries[CRASH_REPORTS_SETTING_KEY];

    const preferences: TelemetryPrivacyPreferences = {
      // Default to true if not explicitly set
      usageAnalyticsEnabled: usageVal !== undefined ? usageVal === "true" : true,
      crashReportsEnabled: crashVal !== undefined ? crashVal === "true" : true,
    };

    if (!context) {
      cachedPreferences = preferences;
    }

    return preferences;
  } catch {
    // Return default preferences safely if database is not migrated yet or query fails
    return {
      usageAnalyticsEnabled: true,
      crashReportsEnabled: true,
    };
  }
}

export function initializeTelemetrySettings(context?: DbContext): void {
  const prefs = getTelemetryPrivacySettings(context);
  void syncTelemetryConsent(prefs);
}

export function setUsageAnalyticsSetting(
  enabled: boolean,
  context?: DbContext,
  now = new Date(),
): void {
  const current = getTelemetryPrivacySettings(context);
  const updated: TelemetryPrivacyPreferences = {
    ...current,
    usageAnalyticsEnabled: enabled,
  };

  cachedPreferences = updated;
  persistSettingsEntries(
    { [USAGE_ANALYTICS_SETTING_KEY]: enabled ? "true" : "false" },
    context,
    now,
  );
  void syncTelemetryConsent(updated);
  notifyListeners(updated);
}

export function setCrashReportsSetting(
  enabled: boolean,
  context?: DbContext,
  now = new Date(),
): void {
  const current = getTelemetryPrivacySettings(context);
  const updated: TelemetryPrivacyPreferences = {
    ...current,
    crashReportsEnabled: enabled,
  };

  cachedPreferences = updated;
  persistSettingsEntries(
    { [CRASH_REPORTS_SETTING_KEY]: enabled ? "true" : "false" },
    context,
    now,
  );
  void syncTelemetryConsent(updated);
  notifyListeners(updated);
}
