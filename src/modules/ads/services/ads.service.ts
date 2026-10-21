import { Platform } from "react-native";
import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";

let isInitialized = false;

/**
 * Safely initializes Google Mobile Ads SDK on native platforms.
 * Sets kid-safe content rating and safe defaults.
 * Safe to call multiple times; no-op on Web.
 */
export async function initializeAdsSdk(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  if (isInitialized) {
    return;
  }

  try {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: ["EMULATOR"],
    });

    await mobileAds().initialize();
    isInitialized = true;
  } catch (error) {
    console.warn("[AdMob] SDK initialization error (gracefully handled):", error);
  }
}
