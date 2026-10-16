import { useEffect, useState } from "react";
import {
  getQuickSyncState,
  setQuickSyncEnabled,
  setQuickSyncNetworkPreference,
  subscribeToQuickSync,
  triggerQuickSync,
} from "../services/quick-sync.service";
import type {
  QuickSyncNetworkPreference,
  QuickSyncState,
} from "../types/google-drive-backup.types";

export function useQuickSync() {
  const [state, setState] = useState<QuickSyncState>(getQuickSyncState);

  useEffect(() => {
    return subscribeToQuickSync(setState);
  }, []);

  return {
    ...state,
    setEnabled: setQuickSyncEnabled,
    setNetworkPreference: setQuickSyncNetworkPreference,
    triggerSync: () => triggerQuickSync({ immediate: true }),
  };
}
