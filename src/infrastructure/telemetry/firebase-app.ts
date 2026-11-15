import { Platform } from "react-native";
import type { FirebaseApp } from "@react-native-firebase/app";
import type { Analytics } from "@react-native-firebase/analytics";
import type { Crashlytics } from "@react-native-firebase/crashlytics";
import type { FirebasePerformance } from "@react-native-firebase/perf";

let cachedApp: FirebaseApp | null = null;
let cachedAnalytics: Analytics | null = null;
let cachedCrashlytics: Crashlytics | null = null;
let cachedPerf: FirebasePerformance | null = null;

export function isFirebaseSupportedPlatform(): boolean {
  return Platform.OS === "android" || Platform.OS === "ios";
}

export function getSafeFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseSupportedPlatform()) {
    return null;
  }
  if (cachedApp) {
    return cachedApp;
  }
  try {
    const fbApp = require("@react-native-firebase/app");
    const apps = fbApp.getApps?.() ?? [];
    if (apps.length > 0) {
      cachedApp = apps[0];
      return cachedApp;
    }
    cachedApp = fbApp.getApp?.() ?? null;
    return cachedApp;
  } catch (error) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[FirebaseApp] Failed to resolve default Firebase app:", error);
    }
    return null;
  }
}

export function getSafeAnalytics(): Analytics | null {
  if (cachedAnalytics) {
    return cachedAnalytics;
  }
  const app = getSafeFirebaseApp();
  if (!app) return null;
  try {
    const fbAnalytics = require("@react-native-firebase/analytics");
    cachedAnalytics = fbAnalytics.getAnalytics?.(app) ?? null;
    return cachedAnalytics;
  } catch (error) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[FirebaseApp] Failed to resolve Analytics instance:", error);
    }
    return null;
  }
}

export function getSafeCrashlytics(): Crashlytics | null {
  if (cachedCrashlytics) {
    return cachedCrashlytics;
  }
  const app = getSafeFirebaseApp();
  if (!app) return null;
  try {
    const fbCrash = require("@react-native-firebase/crashlytics");
    cachedCrashlytics = fbCrash.getCrashlytics?.(app) ?? null;
    return cachedCrashlytics;
  } catch (error) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[FirebaseApp] Failed to resolve Crashlytics instance:", error);
    }
    return null;
  }
}

export function getSafePerformance(): FirebasePerformance | null {
  if (cachedPerf) {
    return cachedPerf;
  }
  const app = getSafeFirebaseApp();
  if (!app) return null;
  try {
    const fbPerf = require("@react-native-firebase/perf");
    cachedPerf = fbPerf.getPerformance?.(app) ?? null;
    return cachedPerf;
  } catch (error) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[FirebaseApp] Failed to resolve Performance instance:", error);
    }
    return null;
  }
}
