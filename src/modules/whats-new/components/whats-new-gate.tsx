import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import { useWorkspace } from "@/modules/onboarding";
import { WhatsNewModal } from "@/modules/whats-new/components/whats-new-modal";
import {
  evaluateAutoShowPresentation,
  markWhatsNewSeen,
} from "@/modules/whats-new/services/whats-new.service";
import type { ReleaseNoteBlock } from "@/modules/whats-new/types/whats-new.types";

export function WhatsNewGate({ children }: PropsWithChildren) {
  const { state } = useWorkspace();
  const [visible, setVisible] = useState(false);
  const [blocks, setBlocks] = useState<ReleaseNoteBlock[]>([]);

  useEffect(() => {
    if (state.status !== "completed") return;

    const presentation = evaluateAutoShowPresentation();
    if (!presentation) return;

    setBlocks(presentation.blocks);
    setVisible(true);
  }, [state.status]);

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
