import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";

import { useWorkspace } from "@/modules/onboarding";
import { useAppLock } from "@/modules/security";
import { useExperiencePreferences } from "@/modules/settings";
import { useProStatus, ProPaywallModal } from "@/modules/pro";
import { getTransactionCount } from "@/modules/transactions";
import { isVersionHistoryPending, subscribeToVersionHistory } from "@/modules/version-history";
import { MIN_TRANSACTIONS_FOR_DEVELOPER_MESSAGE } from "../constants/developer-message.constants";
import { DeveloperMessageModal } from "./developer-message-modal";

export function DeveloperMessageGate({ children }: PropsWithChildren) {
  const { state } = useWorkspace();
  const experience = useExperiencePreferences();
  const { isPro } = useProStatus();
  const { isLocked, isReady } = useAppLock();
  const [visible, setVisible] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const checkEligibility = useCallback(() => {
    clearTimer();
    if (!isReady || isLocked) return;
    if (state.status !== "completed") return;
    if (state.mode !== "personal") return;
    if (experience.isPromptDismissed("developerMessageSeen")) return;
    if (isVersionHistoryPending()) return;

    try {
      const count = getTransactionCount();
      if (count >= MIN_TRANSACTIONS_FOR_DEVELOPER_MESSAGE) {
        // Delay to allow any active modal/screen to settle
        timerRef.current = setTimeout(() => {
          setVisible(true);
          timerRef.current = null;
        }, 750);
      }
    } catch {
      // Ignore during initial SQLite migration or load
    }
  }, [clearTimer, isReady, isLocked, state.status, state.mode, experience]);

  useEffect(() => {
    checkEligibility();
    return clearTimer;
  }, [checkEligibility, clearTimer]);

  useEffect(() => {
    const unsubVersionHistory = subscribeToVersionHistory(() => {
      checkEligibility();
    });
    return unsubVersionHistory;
  }, [checkEligibility]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "FINANCE_APP_TRANSACTION_MUTATED",
      () => {
        checkEligibility();
      },
    );
    return () => {
      sub.remove();
      clearTimer();
    };
  }, [checkEligibility, clearTimer]);

  const handleClose = () => {
    setVisible(false);
    experience.dismissPrompt("developerMessageSeen");
  };

  const handleOpenPro = () => {
    setIsPaywallOpen(true);
  };

  return (
    <>
      {children}
      <DeveloperMessageModal
        isPro={isPro}
        onClose={handleClose}
        onOpenPro={handleOpenPro}
        visible={visible && !isLocked}
      />
      <ProPaywallModal
        onClose={() => setIsPaywallOpen(false)}
        visible={isPaywallOpen && !isLocked}
      />
    </>
  );
}
