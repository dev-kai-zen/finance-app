import type { ShakeAction } from "@/modules/settings";

export type { ShakeAction };

export interface QuickEntryContextValue {
  openChatWithKai: () => void;
  openManualEntry: () => void;
  triggerShakeAction: () => void;
  closeQuickEntry: () => void;
  isQuickEntryOpen: boolean;
}

