import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

import { useWorkspace } from "@/modules/onboarding";
import { useAppLock } from "@/modules/security";
import { useExperiencePreferences } from "@/modules/settings";
import { useProStatus, ProPaywallModal } from "@/modules/pro";
import { getTransactionCount } from "@/modules/transactions";
import { MIN_TRANSACTIONS_FOR_DEVELOPER_MESSAGE } from "../constants/developer-message.constants";
import { DeveloperMessageModal } from "./developer-message-modal";

export function DeveloperMessageGate({ children }: PropsWithChildren) {
  const { state } = useWorkspace();
  const experience = useExperiencePreferences();
  const { isPro } = useProStatus();
  const { isLocked, isReady } = useAppLock();
  const [visible, setVisible] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const checkEligibility = useCallback(() => {
    if (!isReady || isLocked) return;
    if (state.status !== "completed") return;
    if (state.mode !== "personal") return;
    if (experience.isPromptDismissed("developerMessageSeen")) return;

    try {
      const count = getTransactionCount();
      if (count >= MIN_TRANSACTIONS_FOR_DEVELOPER_MESSAGE) {
        // Delay to allow any active modal to finish closing smoothly
        const timer = setTimeout(() => {
          setVisible(true);
        }, 750);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore during initial SQLite migration or load
    }
  }, [isReady, isLocked, state.status, state.mode, experience]);

  useEffect(() => {
    const cleanup = checkEligibility();
    return cleanup;
  }, [checkEligibility]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "FINANCE_APP_TRANSACTION_MUTATED",
      () => {
        checkEligibility();
      },
    );
    return () => sub.remove();
  }, [checkEligibility]);

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
