import { useCallback, useState } from "react";
import { useProStatus } from "./use-pro-status";

export interface ProGuardOptions {
  featureTitle?: string;
  featureDescription?: string;
}

/**
 * Hook to guard actions, toggles, or features behind Kaizen Pro entitlement.
 *
 * If the user is Pro, `guardAction` immediately executes the callback.
 * If the user is Free, `guardAction` blocks execution and automatically opens the Pro paywall modal.
 */
export function useProGuard() {
  const { isPro } = useProStatus();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [guardMeta, setGuardMeta] = useState<ProGuardOptions | null>(null);

  const guardAction = useCallback(
    (action: () => void, meta?: ProGuardOptions): boolean => {
      if (isPro) {
        action();
        return true;
      }
      setGuardMeta(meta ?? null);
      setPaywallVisible(true);
      return false;
    },
    [isPro],
  );

  const openPaywall = useCallback((meta?: ProGuardOptions) => {
    setGuardMeta(meta ?? null);
    setPaywallVisible(true);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
    setGuardMeta(null);
  }, []);

  return {
    isPro,
    paywallVisible,
    guardMeta,
    guardAction,
    openPaywall,
    closePaywall,
  };
}
