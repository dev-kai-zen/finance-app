import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesPackage,
} from "react-native-purchases";
import { PRO_CONSTANTS } from "../constants/pro.constants";
import type {
  ProPackageInfo,
  ProPurchaseResult,
  ProRestoreResult,
} from "../types/pro.types";

let isConfigured = false;
let cachedCurrentPackage: PurchasesPackage | null = null;

function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;
  if (!key || key.trim() === "" || key.includes("your_api_key_here")) {
    return null;
  }
  return key.trim();
}

export function isRevenueCatAvailable(): boolean {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return false;
  const apiKey = getApiKey();
  if (!apiKey) return false;
  if (typeof __DEV__ !== "undefined" && !__DEV__ && apiKey.startsWith("test_")) {
    return false;
  }
  return true;
}

export async function initializeRevenueCat(): Promise<boolean> {
  if (isConfigured) return true;
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return false;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log(
        "[ProBilling] EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY is not set. Pro module is running in local sandbox mode.",
      );
    }
    return false;
  }

  // RevenueCat's native SDK deliberately shows a blocking 'Wrong API Key' dialog
  // and terminates the app if a test_* key is used in a release build.
  // We guard against this so release APKs stay functional and fall back cleanly.
  if (typeof __DEV__ !== "undefined" && !__DEV__ && apiKey.startsWith("test_")) {
    console.warn(
      "[ProBilling] Cannot configure RevenueCat with a test key (test_*) in release builds. Use a Google Play production key (goog_*) or test with a standalone debug APK.",
    );
    return false;
  }

  try {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey });
    isConfigured = true;
    return true;
  } catch (error) {
    console.warn("[ProBilling] Failed to configure Purchases:", error);
    return false;
  }
}

export async function fetchProPackage(): Promise<ProPackageInfo> {
  const fallbackPackage: ProPackageInfo = {
    identifier: "$rc_lifetime",
    productId: PRO_CONSTANTS.LIFETIME_PRODUCT_ID,
    priceString: PRO_CONSTANTS.FALLBACK_PRICE,
    title: PRO_CONSTANTS.FALLBACK_TITLE,
    description: PRO_CONSTANTS.FALLBACK_DESCRIPTION,
  };

  const configured = await initializeRevenueCat();
  if (!configured) {
    return fallbackPackage;
  }

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      // Prefer lifetime package if marked, otherwise first available package
      const lifetimePkg =
        offerings.current.lifetime ??
        offerings.current.availablePackages[0];

      if (lifetimePkg) {
        cachedCurrentPackage = lifetimePkg;
        const product = lifetimePkg.product;
        return {
          identifier: lifetimePkg.identifier,
          productId: product.identifier,
          priceString: product.priceString,
          title: product.title || PRO_CONSTANTS.FALLBACK_TITLE,
          description: product.description || PRO_CONSTANTS.FALLBACK_DESCRIPTION,
        };
      }
    }
  } catch (error) {
    console.warn("[ProBilling] Failed to load offerings, using fallback:", error);
  }

  return fallbackPackage;
}

function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  const active = customerInfo.entitlements.active;
  return (
    active[PRO_CONSTANTS.ENTITLEMENT_ID] !== undefined ||
    active[PRO_CONSTANTS.LEGACY_ENTITLEMENT_ID] !== undefined ||
    Object.keys(active).length > 0
  );
}

export async function purchaseLifetimePackage(): Promise<ProPurchaseResult> {
  const configured = await initializeRevenueCat();
  if (!configured) {
    // Sandbox / Mock Mode when RevenueCat is not yet configured with an API key
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log(
        "[ProBilling] Sandbox mode purchase: simulating successful Lifetime Pro purchase.",
      );
    }
    return { success: true, isPro: true };
  }

  try {
    // If we haven't loaded the package yet, fetch it
    if (!cachedCurrentPackage) {
      await fetchProPackage();
    }

    if (!cachedCurrentPackage) {
      return {
        success: false,
        userCancelled: false,
        error: "Product package not found in store.",
      };
    }

    const { customerInfo } = await Purchases.purchasePackage(
      cachedCurrentPackage,
    );

    const hasEntitlement = hasProEntitlement(customerInfo);

    if (hasEntitlement) {
      return { success: true, isPro: true };
    }

    return {
      success: false,
      userCancelled: false,
      error: "Purchase completed, but entitlement was not activated.",
    };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { success: false, userCancelled: true };
    }
    console.warn("[ProBilling] Purchase error:", error);
    return {
      success: false,
      userCancelled: false,
      error: error?.message || "Payment could not be completed.",
    };
  }
}

export async function restorePurchasesFromStore(): Promise<ProRestoreResult> {
  const configured = await initializeRevenueCat();
  if (!configured) {
    return {
      success: true,
      isPro: false,
      restored: false,
    };
  }

  try {
    const customerInfo: CustomerInfo = await Purchases.restorePurchases();
    const hasEntitlement = hasProEntitlement(customerInfo);

    return {
      success: true,
      isPro: hasEntitlement,
      restored: hasEntitlement,
    };
  } catch (error: any) {
    console.warn("[ProBilling] Restore purchases error:", error);
    return {
      success: false,
      error: error?.message || "Could not restore purchases from store.",
    };
  }
}

export async function queryStoreEntitlementStatus(): Promise<boolean | null> {
  const configured = await initializeRevenueCat();
  if (!configured) return null;

  try {
    const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
    return hasProEntitlement(customerInfo);
  } catch {
    return null; // Network error or offline - keep local status
  }
}
