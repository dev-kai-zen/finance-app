import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import { useWorkspace } from "@/modules/onboarding";
import { useExperiencePreferences } from "@/modules/settings";
import { WhatsNewModal } from "@/modules/whats-new/components/whats-new-modal";
import {
  evaluateAutoShowPresentation,
  markWhatsNewSeen,
} from "@/modules/whats-new/services/whats-new.service";
import type { ReleaseNoteBlock } from "@/modules/whats-new/types/whats-new.types";

export function WhatsNewGate({ children }: PropsWithChildren) {
  const { state } = useWorkspace();
  const experience = useExperiencePreferences();
  const [visible, setVisible] = useState(false);
  const [blocks, setBlocks] = useState<ReleaseNoteBlock[]>([]);

  useEffect(() => {
    if (state.status !== "completed") return;
    if (!experience.isPromptDismissed("developerMessageSeen")) return;

    const presentation = evaluateAutoShowPresentation();
    if (!presentation) return;

    const timer = setTimeout(() => {
      setBlocks(presentation.blocks);
      setVisible(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [state.status, experience.isPromptDismissed]);

  return (
    <>
      {children}
      <WhatsNewModal
        blocks={blocks}
        visible={visible}
        onClose={() => {
          setVisible(false);
          markWhatsNewSeen();
        }}
      />
    </>
  );
}
