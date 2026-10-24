import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { isDevModeAllowed } from "@/utils/dev-mode";

const ADS_SECURE_KEYS = {
  FORCE_TEST_ADS: "kaizen_ads_force_test_ads_v1",
} as const;

let inMemoryForceTestAds = false;
let isInitialized = false;

type AdsDevListener = (isForceTest: boolean) => void;
const listeners = new Set<AdsDevListener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener(inMemoryForceTestAds);
    } catch (err) {
      console.warn("[AdsDevService] Listener error:", err);
    }
  }
}

export function subscribeToAdsDevMode(listener: AdsDevListener): () => void {
  listeners.add(listener);
  listener(inMemoryForceTestAds);
  return () => {
    listeners.delete(listener);
  };
}

export function getIsForceTestAds(): boolean {
  if (!isDevModeAllowed()) {
    return false;
  }
  return inMemoryForceTestAds;
}

export async function initializeAdsDevMode(): Promise<boolean> {
  if (!isDevModeAllowed() || Platform.OS === "web") {
    inMemoryForceTestAds = false;
    isInitialized = true;
    return false;
  }

  if (isInitialized) {
    return inMemoryForceTestAds;
  }

  try {
    const val = await SecureStore.getItemAsync(ADS_SECURE_KEYS.FORCE_TEST_ADS);
    inMemoryForceTestAds = val === "true";
  } catch (err) {
    console.warn("[AdsDevService] Error reading dev ads config:", err);
  }

  isInitialized = true;
  notifyListeners();
  return inMemoryForceTestAds;
}

export async function setForceTestAds(enabled: boolean): Promise<void> {
  if (!isDevModeAllowed()) {
    inMemoryForceTestAds = false;
    notifyListeners();
    return;
  }

  inMemoryForceTestAds = enabled;
  notifyListeners();

  if (Platform.OS === "web") {
    return;
  }

  try {
    if (enabled) {
      await SecureStore.setItemAsync(ADS_SECURE_KEYS.FORCE_TEST_ADS, "true");
    } else {
      await SecureStore.deleteItemAsync(ADS_SECURE_KEYS.FORCE_TEST_ADS);
    }
  } catch (err) {
    console.warn("[AdsDevService] Error persisting dev ads config:", err);
  }
}
