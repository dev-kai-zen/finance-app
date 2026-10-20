import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";
import type { AdBannerPlacement } from "../types/ads.types";

/**
 * Official Google sample test ad unit IDs
 */
export const ADMOB_TEST_UNIT_IDS = {
  ANDROID_BANNER: "ca-app-pub-3940256099942544/6300978111",
  IOS_BANNER: "ca-app-pub-3940256099942544/2934735716",
} as const;

/**
 * Returns the Banner Ad Unit ID based on platform, placement, and environment.
 * If running in development (__DEV__) or if production credentials are not configured,
 * it safely falls back to Google's official TestIds.BANNER to prevent crashes or self-click bans.
 */
export function getBannerAdUnitId(placement: AdBannerPlacement = "dashboard"): string {
  // In development, always use Google's official test ad unit
  if (__DEV__) {
    return TestIds.BANNER;
  }

  if (Platform.OS === "android") {
    const customUnit = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID;
    if (customUnit && customUnit.trim().length > 0) {
      return customUnit.trim();
    }
    return TestIds.BANNER;
  }

  if (Platform.OS === "ios") {
    const customUnit = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS;
    if (customUnit && customUnit.trim().length > 0) {
      return customUnit.trim();
    }
    return TestIds.BANNER;
  }

  return TestIds.BANNER;
}
