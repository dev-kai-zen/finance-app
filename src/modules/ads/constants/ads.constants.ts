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

function getAndroidPlacementUnitId(placement: AdBannerPlacement): string | undefined {
  switch (placement) {
    case "dashboard":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_DASHBOARD;
    case "transactions":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_TRANSACTIONS;
    case "accounts":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_ACCOUNTS;
    case "reports":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_REPORTS;
    case "budgets":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_BUDGETS;
    case "categories":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_CATEGORIES;
    case "calendar":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_CALENDAR;
    case "goals":
      return (
        process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_GOAL ||
        process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_GOALS
      );
    case "subscriptions":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_SUBSCRIPTIONS;
    case "settings":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_SETTINGS;
    case "notes":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_NOTES;
    default:
      return undefined;
  }
}

function getIosPlacementUnitId(placement: AdBannerPlacement): string | undefined {
  switch (placement) {
    case "dashboard":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_DASHBOARD;
    case "transactions":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_TRANSACTIONS;
    case "accounts":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_ACCOUNTS;
    case "reports":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_REPORTS;
    case "budgets":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_BUDGETS;
    case "categories":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_CATEGORIES;
    case "calendar":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_CALENDAR;
    case "goals":
      return (
        process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_GOAL ||
        process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_GOALS
      );
    case "subscriptions":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_SUBSCRIPTIONS;
    case "settings":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_SETTINGS;
    case "notes":
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_NOTES;
    default:
      return undefined;
  }
}

/**
 * Returns the Banner Ad Unit ID based on platform, placement, and environment.
 * If running in development (__DEV__) or if production credentials are not configured,
 * it safely falls back to Google's official TestIds.BANNER to prevent crashes or self-click bans.
 */
export function getBannerAdUnitId(
  placement: AdBannerPlacement = "dashboard",
  forceTest: boolean = false,
): string {
  // In development or when forceTest is enabled, always use Google's official test ad unit
  if (forceTest || __DEV__) {
    return TestIds.BANNER;
  }

  if (Platform.OS === "android") {
    const placementUnit = getAndroidPlacementUnitId(placement);
    if (placementUnit && placementUnit.trim().length > 0) {
      return placementUnit.trim();
    }
    const defaultUnit = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID;
    if (defaultUnit && defaultUnit.trim().length > 0) {
      return defaultUnit.trim();
    }
    return TestIds.BANNER;
  }

  if (Platform.OS === "ios") {
    const placementUnit = getIosPlacementUnitId(placement);
    if (placementUnit && placementUnit.trim().length > 0) {
      return placementUnit.trim();
    }
    const defaultUnit = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS;
    if (defaultUnit && defaultUnit.trim().length > 0) {
      return defaultUnit.trim();
    }
    return TestIds.BANNER;
  }

  return TestIds.BANNER;
}
