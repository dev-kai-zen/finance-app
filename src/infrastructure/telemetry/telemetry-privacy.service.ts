import {
  getSafeAnalytics,
  getSafeCrashlytics,
  getSafePerformance,
} from "./firebase-app";
import type { TelemetryPrivacyPreferences } from "./types";

let currentUsageAnalytics = true;
let currentCrashReports = true;

export function isUsageAnalyticsEnabled(): boolean {
  return currentUsageAnalytics;
}

export function isCrashReportsEnabled(): boolean {
  return currentCrashReports;
}

export async function syncTelemetryConsent(
  preferences: TelemetryPrivacyPreferences,
): Promise<void> {
  currentUsageAnalytics = preferences.usageAnalyticsEnabled;
  currentCrashReports = preferences.crashReportsEnabled;

  const analytics = getSafeAnalytics();
  if (analytics) {
    try {
      const fbAnalytics = require("@react-native-firebase/analytics");
      await fbAnalytics.setAnalyticsCollectionEnabled?.(
        analytics,
        preferences.usageAnalyticsEnabled,
      );
    } catch (err) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("[TelemetryPrivacy] Failed to set analytics collection:", err);
      }
    }
  }

  const crashlytics = getSafeCrashlytics();
  if (crashlytics) {
    try {
      const fbCrash = require("@react-native-firebase/crashlytics");
      await fbCrash.setCrashlyticsCollectionEnabled?.(
        crashlytics,
        preferences.crashReportsEnabled,
      );
    } catch (err) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("[TelemetryPrivacy] Failed to set crashlytics collection:", err);
      }
    }
  }

  const perf = getSafePerformance();
  if (perf) {
    try {
      perf.dataCollectionEnabled = preferences.crashReportsEnabled;
      perf.instrumentationEnabled = preferences.crashReportsEnabled;
    } catch (err) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("[TelemetryPrivacy] Failed to set perf collection:", err);
      }
    }
  }
}
