import { useCallback, useEffect, useState } from "react";
import {
  getCurrentProStatus,
  getProPackage,
  initializeProStatus,
  purchasePro,
  resetProStatusForTesting,
  restorePro,
  setDevSimulationMode,
  subscribeToProStatus,
} from "../services/pro-status.service";
import type {
  ProEntitlementState,
  ProPackageInfo,
  ProPurchaseResult,
  ProRestoreResult,
} from "../types/pro.types";

export function useProStatus() {
  const [state, setState] = useState<ProEntitlementState>(getCurrentProStatus());
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [offering, setOffering] = useState<ProPackageInfo | null>(null);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = subscribeToProStatus((newState) => {
      if (mounted) {
        setState(newState);
      }
    });

    initializeProStatus()
      .then((initialState) => {
        if (mounted) {
          setState(initialState);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    getProPackage()
      .then((pkg) => {
        if (mounted) {
          setOffering(pkg);
        }
      })
      .catch(() => {
        // Fallback already handled
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const purchaseLifetime = useCallback(async (): Promise<ProPurchaseResult> => {
    setIsPurchasing(true);
    try {
      return await purchasePro();
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<ProRestoreResult> => {
    setIsRestoring(true);
    try {
      return await restorePro();
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const toggleDevSimulation = useCallback(async (enabled: boolean): Promise<void> => {
    await setDevSimulationMode(enabled);
  }, []);

  const resetProStatus = useCallback(async (): Promise<void> => {
    await resetProStatusForTesting();
  }, []);

  return {
    isPro: state.isPro,
    unlockedAt: state.unlockedAt,
    source: state.source,
    isDevSimulated: state.source === "dev_simulation",
    isLoading,
    isPurchasing,
    isRestoring,
    offering,
    purchaseLifetime,
    restorePurchases,
    toggleDevSimulation,
    resetProStatus,
  };
}
