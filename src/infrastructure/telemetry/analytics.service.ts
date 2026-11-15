import type { EventParams } from "@react-native-firebase/analytics";
import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";
import { getSafeAnalytics } from "./firebase-app";
import { isUsageAnalyticsEnabled } from "./telemetry-privacy.service";
import type { TelemetryEventName, TelemetryEventParams } from "./types";

/**
 * List of forbidden keys that must never be sent in telemetry payloads
 * to protect financial privacy.
 */
const FORBIDDEN_KEYS = new Set([
  "amount",
  "balance",
  "total",
  "note",
  "notes",
  "description",
  "title",
  "memo",
  "account_number",
  "account_name",
  "email",
  "name",
  "card_number",
  "cvv",
  "password",
  "pin",
]);

function sanitizeParams<T extends Record<string, unknown>>(params?: T): EventParams | undefined {
  if (!params) return undefined;
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(lowerKey)) {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized as EventParams;
}

/**
 * Dispatches a typed, privacy-guaranteed analytics event asynchronously.
 * Never blocks the JavaScript thread or UI animations (scheduled after interactions).
 */
export function logTelemetryEvent<K extends TelemetryEventName>(
  eventName: K,
  params?: TelemetryEventParams[K],
): void {
  if (!isUsageAnalyticsEnabled()) {
    return;
  }

  scheduleAfterInteractions(() => {
    try {
      const analytics = getSafeAnalytics();
      if (!analytics) return;

      const fbAnalytics = require("@react-native-firebase/analytics");
      const safeParams = sanitizeParams(params);
      fbAnalytics.logEvent?.(analytics, eventName as any, safeParams);
    } catch (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn(`[Analytics] Failed to log event "${eventName}":`, error);
      }
    }
  });
}

/**
 * Logs a screen navigation view event.
 */
export function logTelemetryScreen(screenName: string): void {
  if (!isUsageAnalyticsEnabled() || !screenName) {
    return;
  }

  logTelemetryEvent("screen_view", {
    screen_name: screenName,
  });
}
