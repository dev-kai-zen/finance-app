import NetInfo from "@react-native-community/netinfo";

import {
  getQuickSyncConfig,
  getQuickSyncState,
  queueDebouncedQuickSync,
  registerQuickSyncDebouncedExecutor,
  resetQuickSyncLocalMetadata,
  saveQuickSyncConfig,
  setQuickSyncRuntimeStatus,
  subscribeToQuickSync,
  uploadOrUpdateGoogleDriveQuickSyncBackup,
  type QuickSyncNetworkPreference,
  type QuickSyncState,
} from "@/infrastructure/sync";
import { createBackupArchive } from "@/modules/local-backup";
import {
  restoreGoogleDriveSession,
  withGoogleDriveAccessToken,
} from "./google-drive-auth.service";

let activeSyncPromise: Promise<boolean> | null = null;

export { getQuickSyncState, subscribeToQuickSync };

export function resetQuickSyncConnection(): void {
  resetQuickSyncLocalMetadata();
  setQuickSyncRuntimeStatus("disabled");
}

/** Debounced Quick Sync after user preference / settings writes (not Quick Sync metadata). */
export function queueQuickSyncForPreferenceChange(
  changedKeys: readonly string[],
): void {
  queueDebouncedQuickSync(changedKeys);
}

export async function setQuickSyncEnabled(enabled: boolean): Promise<void> {
  saveQuickSyncConfig({ enabled });
  if (enabled) {
    setQuickSyncRuntimeStatus("idle");
    void triggerQuickSync({ immediate: true });
  } else {
    setQuickSyncRuntimeStatus("disabled");
  }
}

export function setQuickSyncNetworkPreference(
  network: QuickSyncNetworkPreference,
): void {
  saveQuickSyncConfig({ network });
  const state = getQuickSyncState();
  if (state.status === "waiting_network") {
    void triggerQuickSync();
  }
}

export async function triggerQuickSync(options?: {
  immediate?: boolean;
}): Promise<boolean> {
  const config = getQuickSyncConfig();
  if (!config.enabled) {
    setQuickSyncRuntimeStatus("disabled");
    return false;
  }

  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = performSync(config.network, config.fileId).finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}

async function performSync(
  networkPreference: QuickSyncNetworkPreference,
  existingFileId: string | null,
): Promise<boolean> {
  try {
    // 1. Verify Google Drive session is active
    const user = await restoreGoogleDriveSession().catch(() => null);
    if (!user) {
      setQuickSyncRuntimeStatus("idle");
      return false;
    }

    // 2. Verify network connection
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setQuickSyncRuntimeStatus("waiting_network");
      return false;
    }

    if (
      networkPreference === "wifi_only" &&
      netState.type !== "wifi" &&
      netState.type !== "ethernet"
    ) {
      setQuickSyncRuntimeStatus("waiting_network");
      return false;
    }

    // 3. Mark syncing
    setQuickSyncRuntimeStatus("syncing");

    // Account check: If active user differs from saved accountEmail, do not reuse old account's fileId
    const config = getQuickSyncConfig();
    let fileIdToUse = existingFileId;
    if (config.accountEmail && user.email && config.accountEmail !== user.email) {
      fileIdToUse = null;
    }

    // 4. Create database snapshot (unprotected for background auto-sync)
    const archive = await createBackupArchive(null);

    // 5. Upload or update backup file in Google Drive
    const backupFile = await withGoogleDriveAccessToken((accessToken) =>
      uploadOrUpdateGoogleDriveQuickSyncBackup(
        accessToken,
        archive.bytes,
        fileIdToUse,
      ),
    );

    // 6. Update configuration with fileId, accountEmail, and last synced timestamp
    const nowIso = new Date().toISOString();
    saveQuickSyncConfig({
      fileId: backupFile.id,
      accountEmail: user.email,
      lastSyncedAt: nowIso,
    });

    setQuickSyncRuntimeStatus("synced");
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Quick sync failed.";
    setQuickSyncRuntimeStatus("error", message);
    return false;
  }
}

registerQuickSyncDebouncedExecutor(() => {
  void triggerQuickSync().catch(() => {
    // Errors are broadcast through QuickSyncState
  });
});
