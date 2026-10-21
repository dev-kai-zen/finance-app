import { useCallback, useEffect, useState } from "react";
import {
  getIsForceTestAds,
  initializeAdsDevMode,
  setForceTestAds,
  subscribeToAdsDevMode,
} from "../services/ads-dev.service";

export function useAdsDevMode() {
  const [isForceTestAds, setIsForceTestAdsState] = useState<boolean>(getIsForceTestAds());

  useEffect(() => {
    let mounted = true;

    void initializeAdsDevMode().then((val) => {
      if (mounted) {
        setIsForceTestAdsState(val);
      }
    });

    const unsubscribe = subscribeToAdsDevMode((val) => {
      if (mounted) {
        setIsForceTestAdsState(val);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const toggleForceTestAds = useCallback(async (enabled: boolean): Promise<void> => {
    await setForceTestAds(enabled);
  }, []);

  return {
    isForceTestAds,
    toggleForceTestAds,
  };
}
