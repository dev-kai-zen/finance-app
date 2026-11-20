import { useEffect, useState } from "react";
import { restoreQuickSyncBackup } from "../services/restore-google-drive-backup.service";
import {
  checkQuickSyncRemoteStatus,
  dismissQuickSyncConflictPrompt,
  getQuickSyncState,
  openQuickSyncConflictPrompt,
  resolveQuickSyncConflictByOverwrite,
  resolveQuickSyncConflictByRestore,
  setQuickSyncDeviceLabel,
  setQuickSyncEnabled,
  setQuickSyncNetworkPreference,
  subscribeToQuickSync,
  triggerQuickSync,
} from "../services/quick-sync.service";
import type { QuickSyncState } from "../types/google-drive-backup.types";

export function useQuickSync() {
  const [state, setState] = useState<QuickSyncState>(getQuickSyncState);

  useEffect(() => {
    return subscribeToQuickSync(setState);
  }, []);

  return {
    ...state,
    setEnabled: setQuickSyncEnabled,
    setNetworkPreference: setQuickSyncNetworkPreference,
    setDeviceLabel: setQuickSyncDeviceLabel,
    checkRemoteStatus: () =>
      checkQuickSyncRemoteStatus({ force: true, openPromptOnConflict: true }),
    triggerSync: () => triggerQuickSync({ immediate: true }),
    restoreFromQuickSync: (fileId?: string) => restoreQuickSyncBackup(fileId),
    openConflictPrompt: openQuickSyncConflictPrompt,
    dismissConflictPrompt: dismissQuickSyncConflictPrompt,
    resolveConflictByRestore: resolveQuickSyncConflictByRestore,
    resolveConflictByOverwrite: resolveQuickSyncConflictByOverwrite,
  };
}
