import { isDevModeAllowed } from "@/utils/dev-mode";
import {
  clearCachedProUnlock,
  readCachedProState,
  writeCachedProUnlock,
  writeDevSimulatedPro,
} from "../repositories/pro-storage.repository";
import {
  fetchProPackage,
  purchaseLifetimePackage,
  queryStoreEntitlementStatus,
  restorePurchasesFromStore,
} from "./pro-billing.service";
import type {
  ProEntitlementState,
  ProPackageInfo,
  ProPurchaseResult,
  ProRestoreResult,
} from "../types/pro.types";

type ProStatusListener = (state: ProEntitlementState) => void;

const listeners = new Set<ProStatusListener>();

let currentState: ProEntitlementState = {
  isPro: false,
  unlockedAt: null,
  productId: null,
  isLifetime: true,
  source: "none",
};

let isInitialized = false;

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener(currentState);
    } catch (err) {
      console.warn("[ProStatusService] Listener notification error:", err);
    }
  }
}

export function subscribeToProStatus(
  listener: ProStatusListener,
): () => void {
  listeners.add(listener);
  // Emit current state immediately
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentProStatus(): ProEntitlementState {
  return currentState;
}

export async function initializeProStatus(): Promise<ProEntitlementState> {
  if (isInitialized) {
    return currentState;
  }

  // 1. Immediately read offline cached state from SecureStore (0ms)
  const cached = await readCachedProState();

  if (cached.isDevSimulated) {
    currentState = {
      isPro: true,
      unlockedAt: cached.unlockedAt ?? new Date().toISOString(),
      productId: "dev_simulation",
      isLifetime: true,
      source: "dev_simulation",
    };
  } else if (cached.isPro) {
    currentState = {
      isPro: true,
      unlockedAt: cached.unlockedAt,
      productId: cached.productId,
      isLifetime: true,
      source: "secure_store",
    };
  } else {
    currentState = {
      isPro: false,
      unlockedAt: null,
      productId: null,
      isLifetime: true,
      source: "none",
    };
  }

  isInitialized = true;
  notifyListeners();

  // 2. Perform background verification with store if online
  if (!cached.isDevSimulated) {
    queryStoreEntitlementStatus()
      .then(async (remoteStatus) => {
        if (remoteStatus === null) {
          // Offline or not configured - keep local cached status
          return;
        }

        if (remoteStatus && !currentState.isPro) {
          // User purchased on another device or reinstalled without manual restore
          await writeCachedProUnlock("kaizen_pro_lifetime");
          currentState = {
            isPro: true,
            unlockedAt: new Date().toISOString(),
            productId: "kaizen_pro_lifetime",
            isLifetime: true,
            source: "revenuecat",
          };
          notifyListeners();
        } else if (!remoteStatus && currentState.isPro && currentState.source === "revenuecat") {
          // Remote revoked (refunded or chargeback)
          await clearCachedProUnlock();
          currentState = {
            isPro: false,
            unlockedAt: null,
            productId: null,
            isLifetime: true,
            source: "none",
          };
          notifyListeners();
        }
      })
      .catch(() => {
        // Silently preserve offline state
      });
  }

  return currentState;
}

export async function purchasePro(): Promise<ProPurchaseResult> {
  const result = await purchaseLifetimePackage();

  if (result.success && result.isPro) {
    const productId = "kaizen_pro_lifetime";
    await writeCachedProUnlock(productId);

    currentState = {
      isPro: true,
      unlockedAt: new Date().toISOString(),
      productId,
      isLifetime: true,
      source: "revenuecat",
    };
    notifyListeners();
  }

  return result;
}

export async function restorePro(): Promise<ProRestoreResult> {
  const result = await restorePurchasesFromStore();

  if (result.success && result.isPro) {
    const productId = "kaizen_pro_lifetime";
    await writeCachedProUnlock(productId);

    currentState = {
      isPro: true,
      unlockedAt: new Date().toISOString(),
      productId,
      isLifetime: true,
      source: "revenuecat",
    };
    notifyListeners();
    return { success: true, isPro: true, restored: true };
  }

  if (result.success && !result.isPro) {
    // If user restored but store has no purchases, verify if we had dev simulation active
    const cached = await readCachedProState();
    if (cached.isDevSimulated) {
      return { success: true, isPro: true, restored: true };
    }
    return { success: true, isPro: false, restored: false };
  }

  return result;
}

export async function setDevSimulationMode(enabled: boolean): Promise<void> {
  if (!isDevModeAllowed()) {
    return;
  }
  await writeDevSimulatedPro(enabled);

  if (enabled) {
    currentState = {
      isPro: true,
      unlockedAt: new Date().toISOString(),
      productId: "dev_simulation",
      isLifetime: true,
      source: "dev_simulation",
    };
  } else {
    const cached = await readCachedProState();
    currentState = {
      isPro: cached.isPro && !cached.isDevSimulated,
      unlockedAt: cached.unlockedAt,
      productId: cached.productId,
      isLifetime: true,
      source: cached.isPro ? "secure_store" : "none",
    };
  }

  notifyListeners();
}

export async function resetProStatusForTesting(): Promise<void> {
  await clearCachedProUnlock();
  await writeDevSimulatedPro(false);

  currentState = {
    isPro: false,
    unlockedAt: null,
    productId: null,
    isLifetime: true,
    source: "none",
  };

  notifyListeners();
}

export async function getProPackage(): Promise<ProPackageInfo> {
  return await fetchProPackage();
}
