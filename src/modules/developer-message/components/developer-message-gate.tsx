import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import { useWorkspace } from "@/modules/onboarding";
import { useExperiencePreferences } from "@/modules/settings";
import { useProStatus, ProPaywallModal } from "@/modules/pro";
import { DeveloperMessageModal } from "./developer-message-modal";

export function DeveloperMessageGate({ children }: PropsWithChildren) {
  const { state } = useWorkspace();
  const experience = useExperiencePreferences();
  const { isPro } = useProStatus();
  const [visible, setVisible] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  useEffect(() => {
    if (state.status !== "completed") return;
    if (experience.isPromptDismissed("developerMessageSeen")) return;

    // Small delay to ensure the dashboard/stack is fully mounted
    const timer = setTimeout(() => {
      setVisible(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [state.status, experience.isPromptDismissed]);

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
        visible={visible}
      />
      <ProPaywallModal
        onClose={() => setIsPaywallOpen(false)}
        visible={isPaywallOpen}
      />
    </>
  );
}
