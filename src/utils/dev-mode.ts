/**
 * Determines whether Developer Mode and associated testing/debugging tools
 * (e.g., SQLite Monitor, Pro simulation, force Google test ads) are accessible in this build.
 *
 * Rules:
 * - Always allowed in local debug builds (`__DEV__ === true`).
 * - For standalone release builds (APK/AAB), strictly enabled only when `EXPO_PUBLIC_ENABLE_DEV_MODE=true`
 *   was set at build time (e.g., `npm run android:apk:dev`).
 * - Official Google Play Store production builds (`npm run android:aab:release`) omit or set this to false,
 *   completely locking out developer settings, 10-tap unlock gestures, and Pro simulation bypasses.
 */
export function isDevModeAllowed(): boolean {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return true;
  }
  return process.env.EXPO_PUBLIC_ENABLE_DEV_MODE === "true";
}
