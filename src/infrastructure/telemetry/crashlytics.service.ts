import { getSafeCrashlytics } from "./firebase-app";
import { isCrashReportsEnabled } from "./telemetry-privacy.service";

/**
 * Sanitizes context string values to prevent leaking financial data into crash logs.
 */
function sanitizeContext(context?: Record<string, string>): Record<string, string> {
  if (!context) return {};
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(context)) {
    const lowerKey = k.toLowerCase();
    if (
      lowerKey.includes("amount") ||
      lowerKey.includes("balance") ||
      lowerKey.includes("note") ||
      lowerKey.includes("account") ||
      lowerKey.includes("email")
    ) {
      continue;
    }
    clean[k] = String(v).slice(0, 100);
  }
  return clean;
}

/**
 * Records a non-fatal JavaScript or application error to Crashlytics.
 */
export function recordCrashlyticsError(
  error: unknown,
  context?: Record<string, string>,
): void {
  if (!isCrashReportsEnabled()) {
    return;
  }

  try {
    const crashlytics = getSafeCrashlytics();
    if (!crashlytics) return;

    const fbCrash = require("@react-native-firebase/crashlytics");

    if (context) {
      const safe = sanitizeContext(context);
      for (const [key, value] of Object.entries(safe)) {
        void fbCrash.setAttribute?.(crashlytics, key, value);
      }
    }

    const err =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : JSON.stringify(error));

    fbCrash.recordError?.(crashlytics, err);
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[Crashlytics] Failed to record error:", e);
    }
  }
}

/**
 * Appends a diagnostic log message to Crashlytics breadcrumbs.
 */
export function logCrashlyticsBreadcrumb(message: string): void {
  if (!isCrashReportsEnabled() || !message) {
    return;
  }
  try {
    const crashlytics = getSafeCrashlytics();
    if (!crashlytics) return;
    const fbCrash = require("@react-native-firebase/crashlytics");
    fbCrash.log?.(crashlytics, message.slice(0, 500));
  } catch {
    // Silently ignore logging failures
  }
}

/**
 * Sets a custom Crashlytics diagnostic attribute (e.g. "theme", "language").
 */
export function setCrashlyticsDiagnosticAttribute(
  name: string,
  value: string,
): void {
  if (!isCrashReportsEnabled()) {
    return;
  }
  try {
    const crashlytics = getSafeCrashlytics();
    if (!crashlytics) return;
    const fbCrash = require("@react-native-firebase/crashlytics");
    void fbCrash.setAttribute?.(crashlytics, name, value.slice(0, 100));
  } catch {
    // Silently ignore
  }
}

/**
 * Deliberately triggers a native test crash for verification purposes.
 * Strictly gated to DEV mode and never permitted in production.
 */
export function triggerDevTestCrash(): void {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    console.warn("[Crashlytics] Test crash is only permitted in development mode.");
    return;
  }
  const crashlytics = getSafeCrashlytics();
  if (crashlytics) {
    const fbCrash = require("@react-native-firebase/crashlytics");
    fbCrash.crash?.(crashlytics);
  }
}
