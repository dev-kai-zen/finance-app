export * from "./types";
export {
  isFirebaseSupportedPlatform,
  getSafeFirebaseApp,
  getSafeAnalytics,
  getSafeCrashlytics,
  getSafePerformance,
} from "./firebase-app";
export {
  logTelemetryEvent,
  logTelemetryScreen,
} from "./analytics.service";
export {
  recordCrashlyticsError,
  logCrashlyticsBreadcrumb,
  setCrashlyticsDiagnosticAttribute,
  triggerDevTestCrash,
} from "./crashlytics.service";
export {
  startPerformanceTrace,
  measureAsyncTrace,
  type ActiveTraceHandle,
} from "./performance.service";
export {
  isUsageAnalyticsEnabled,
  isCrashReportsEnabled,
  syncTelemetryConsent,
} from "./telemetry-privacy.service";
