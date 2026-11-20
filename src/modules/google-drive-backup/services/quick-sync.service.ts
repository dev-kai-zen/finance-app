import NetInfo from "@react-native-community/netinfo";

import { isDatabaseReplacing } from "@/infrastructure/database";
import {
  clearQuickSyncRemoteConflict,
  clearQuickSyncRemoteTracking,
  createQuickSyncRevisionId,
  evaluateQuickSyncRemoteState,
  formatQuickSyncDeviceDisplayName,
  getGoogleDriveQuickSyncFileMetadata,
  getQuickSyncConfig,
  getQuickSyncDeviceMetadata,
  getQuickSyncHardwareDeviceName,
  getQuickSyncState,
  queueDebouncedQuickSync,
  registerQuickSyncDebouncedExecutor,
  resetQuickSyncLocalMetadata,
  saveQuickSyncConfig,
  setQuickSyncConflictPromptVisible,
  setQuickSyncCustomDeviceName,
  setQuickSyncRemoteConflict,
  setQuickSyncRuntimeStatus,
  subscribeToQuickSync,
  updateQuickSyncDeviceMetadata,
  uploadOrUpdateGoogleDriveQuickSyncBackup,
  type QuickSyncNetworkPreference,
} from "@/infrastructure/sync";
import { isPersonalWorkspace } from "@/modules/onboarding";
import { createBackupArchive } from "@/modules/local-backup";
import {
  restoreGoogleDriveSession,
  withGoogleDriveAccessToken,
} from "./google-drive-auth.service";
import { restoreQuickSyncBackup } from "./restore-google-drive-backup.service";

const QUICK_SYNC_CHECK_COOLDOWN_MS = 12_000;

let activeSyncPromise: Promise<boolean> | null = null;
let activeCheckPromise: Promise<QuickSyncCheckResult> | null = null;
let lastRemoteCheckCompletedAt = 0;

export type QuickSyncCheckResult =
  | "skipped"
  | "up_to_date"
  | "remote_ahead"
  | "uploaded"
  | "error";

export { getQuickSyncState, subscribeToQuickSync };

export function resetQuickSyncConnection(): void {
  resetQuickSyncLocalMetadata();
  clearQuickSyncRemoteTracking();
  clearQuickSyncRemoteConflict();
  lastRemoteCheckCompletedAt = 0;
  setQuickSyncRuntimeStatus("disabled");
}

/** Debounced Quick Sync after user preference / settings writes (not Quick Sync metadata). */
export function queueQuickSyncForPreferenceChange(
  changedKeys: readonly string[],
): void {
  queueDebouncedQuickSync(changedKeys);
}

export function setQuickSyncDeviceLabel(label: string | null): void {
  setQuickSyncCustomDeviceName(label);
}

export function openQuickSyncConflictPrompt(): void {
  setQuickSyncConflictPromptVisible(true);
}

export function dismissQuickSyncConflictPrompt(): void {
  setQuickSyncConflictPromptVisible(false);
}

export async function setQuickSyncEnabled(enabled: boolean): Promise<void> {
  saveQuickSyncConfig({ enabled });
  if (enabled) {
    clearQuickSyncRemoteConflict();
    setQuickSyncRuntimeStatus("idle");
    void triggerQuickSync({ immediate: true });
  } else {
    clearQuickSyncRemoteConflict();
    setQuickSyncRuntimeStatus("disabled");
  }
}

export function setQuickSyncNetworkPreference(
  network: QuickSyncNetworkPreference,
): void {
  saveQuickSyncConfig({ network });
  const state = getQuickSyncState();
  if (state.status === "waiting_network") {
    void checkQuickSyncRemoteStatus({ force: true, openPromptOnConflict: true });
  }
}

export async function checkQuickSyncRemoteStatus(options?: {
  force?: boolean;
  openPromptOnConflict?: boolean;
  config?: ReturnType<typeof getQuickSyncConfig>;
}): Promise<QuickSyncCheckResult> {
  if (isDatabaseReplacing() || !isPersonalWorkspace()) {
    return "skipped";
  }

  const config = options?.config ?? getQuickSyncConfig();
  if (!config.enabled) {
    setQuickSyncRuntimeStatus("disabled");
    return "skipped";
  }

  if (activeSyncPromise) {
    return "skipped";
  }

  if (activeCheckPromise) {
    return activeCheckPromise;
  }

  const now = Date.now();
  if (
    !options?.force &&
    now - lastRemoteCheckCompletedAt < QUICK_SYNC_CHECK_COOLDOWN_MS
  ) {
    return "skipped";
  }

  activeCheckPromise = performRemoteCheck(
    config,
    options?.openPromptOnConflict ?? true,
  ).finally(() => {
    activeCheckPromise = null;
  });

  return activeCheckPromise;
}

export async function triggerQuickSync(options?: {
  immediate?: boolean;
  forceOverwrite?: boolean;
  config?: ReturnType<typeof getQuickSyncConfig>;
}): Promise<boolean> {
  if (isDatabaseReplacing()) {
    return false;
  }

  const config = options?.config ?? getQuickSyncConfig();
  if (!config.enabled) {
    setQuickSyncRuntimeStatus("disabled");
    return false;
  }

  // If a remote-ahead conflict is already active, never silently overwrite Drive.
  const currentState = getQuickSyncState();
  if (currentState.remoteConflict && !options?.forceOverwrite) {
    if (options?.immediate) {
      setQuickSyncConflictPromptVisible(true);
    }
    return false;
  }

  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = performSync(
    config.network,
    config.fileId,
    Boolean(options?.forceOverwrite),
  ).finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}

export async function resolveQuickSyncConflictByRestore(): Promise<void> {
  const conflict = getQuickSyncState().remoteConflict;
  setQuickSyncRuntimeStatus("syncing");
  try {
    await restoreQuickSyncBackup(conflict?.fileId);
    lastRemoteCheckCompletedAt = Date.now();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not restore Quick Sync backup.";
    if (conflict) {
      setQuickSyncRemoteConflict(conflict, { openPrompt: true });
    } else {
      setQuickSyncRuntimeStatus("error", message);
    }
    throw error;
  }
}

export async function resolveQuickSyncConflictByOverwrite(): Promise<boolean> {
  const succeeded = await triggerQuickSync({
    immediate: true,
    forceOverwrite: true,
  });
  if (!succeeded) {
    const state = getQuickSyncState();
    throw new Error(state.lastError ?? "Could not overwrite Quick Sync data.");
  }
  return true;
}

async function performRemoteCheck(
  config: ReturnType<typeof getQuickSyncConfig>,
  openPromptOnConflict: boolean,
): Promise<QuickSyncCheckResult> {
  try {
    if (!isPersonalWorkspace() || isDatabaseReplacing()) {
      return "skipped";
    }

    const user = await restoreGoogleDriveSession().catch(() => null);
    if (!user) {
      return "skipped";
    }

    const networkOk = await verifyNetworkForQuickSync(config.network);
    if (!networkOk) {
      return "skipped";
    }

    if (handleAccountEmailMismatch(config, user.email)) {
      return "skipped";
    }

    const remoteFile = await withGoogleDriveAccessToken((accessToken) =>
      getGoogleDriveQuickSyncFileMetadata(accessToken, config.fileId),
    );
    lastRemoteCheckCompletedAt = Date.now();

    const deviceMetadata = getQuickSyncDeviceMetadata();
    const evaluation = evaluateQuickSyncRemoteState(remoteFile, {
      fileId: config.fileId,
      lastSyncedAt: config.lastSyncedAt,
      lastKnownRemoteSyncId: deviceMetadata.lastKnownRemoteSyncId,
      lastKnownRemoteHeadRevisionId: deviceMetadata.lastKnownRemoteHeadRevisionId,
      lastKnownRemoteVersion: deviceMetadata.lastKnownRemoteVersion,
      lastKnownRemoteModifiedTime: deviceMetadata.lastKnownRemoteModifiedTime,
      lastKnownRemoteFileId: deviceMetadata.lastKnownRemoteFileId,
      deviceId: deviceMetadata.deviceId,
      hasUnsyncedLocalChanges: deviceMetadata.hasUnsyncedLocalChanges,
    });

    if (evaluation.status === "remote_ahead") {
      setQuickSyncRemoteConflict(evaluation.conflict, {
        openPrompt: openPromptOnConflict,
      });
      return "remote_ahead";
    }

    if (evaluation.status === "adopt_self") {
      saveQuickSyncConfig({
        fileId: evaluation.remoteFile.id,
        accountEmail: user.email,
        lastSyncedAt: evaluation.remoteFile.modifiedTime,
      });
      updateQuickSyncDeviceMetadata({
        lastKnownRemoteSyncId: evaluation.remoteFile.syncRevisionId,
        lastKnownRemoteHeadRevisionId: evaluation.remoteFile.headRevisionId,
        lastKnownRemoteVersion: evaluation.remoteFile.version,
        lastKnownRemoteModifiedTime: evaluation.remoteFile.modifiedTime,
        lastKnownRemoteFileId: evaluation.remoteFile.id,
      });
      clearQuickSyncRemoteConflict();
    } else if (evaluation.status === "up_to_date") {
      const needsBaselineBackfill =
        (deviceMetadata.lastKnownRemoteSyncId === null &&
          evaluation.remoteFile.syncRevisionId !== null) ||
        (deviceMetadata.lastKnownRemoteHeadRevisionId === null &&
          evaluation.remoteFile.headRevisionId !== null) ||
        (deviceMetadata.lastKnownRemoteVersion === null &&
          evaluation.remoteFile.version !== null);

      if (needsBaselineBackfill) {
        updateQuickSyncDeviceMetadata({
          lastKnownRemoteSyncId: evaluation.remoteFile.syncRevisionId,
          lastKnownRemoteHeadRevisionId: evaluation.remoteFile.headRevisionId,
          lastKnownRemoteVersion: evaluation.remoteFile.version,
          lastKnownRemoteModifiedTime: evaluation.remoteFile.modifiedTime,
          lastKnownRemoteFileId: evaluation.remoteFile.id,
        });
      }
      clearQuickSyncRemoteConflict();
    }

    // Only upload after a read-only check when this device actually has
    // unsynced local changes (e.g., edited offline and just reconnected) or
    // no remote Quick Sync file exists yet.
    const shouldUploadAfterCheck =
      deviceMetadata.hasUnsyncedLocalChanges || evaluation.status === "missing";

    if (shouldUploadAfterCheck) {
      const uploaded = await triggerQuickSync({
        config: getQuickSyncConfig(),
      });
      return uploaded ? "uploaded" : "up_to_date";
    }

    return "up_to_date";
  } catch {
    // Background startup/resume checks are non-fatal and offline-first.
    return "error";
  }
}

async function performSync(
  networkPreference: QuickSyncNetworkPreference,
  existingFileId: string | null,
  forceOverwrite: boolean,
): Promise<boolean> {
  try {
    // 0. Ensure app is in a valid completed personal workspace (never sync empty onboarding database)
    if (!isPersonalWorkspace() || isDatabaseReplacing()) {
      return false;
    }

    // 1. Verify Google Drive session is active
    const user = await restoreGoogleDriveSession().catch(() => null);
    if (!user) {
      setQuickSyncRuntimeStatus("idle");
      return false;
    }

    // 2. Verify network connection
    const networkOk = await verifyNetworkForQuickSync(networkPreference);
    if (!networkOk) {
      return false;
    }

    // Account check: If active user differs from saved accountEmail, do NOT auto-overwrite
    const config = getQuickSyncConfig();
    if (handleAccountEmailMismatch(config, user.email)) {
      return false;
    }

    const deviceMetadata = getQuickSyncDeviceMetadata();

    // 2.5 Pre-Upload Gate: Check whether Drive moved ahead before uploading
    if (!forceOverwrite) {
      const remoteFile = await withGoogleDriveAccessToken((accessToken) =>
        getGoogleDriveQuickSyncFileMetadata(accessToken, existingFileId),
      );
      lastRemoteCheckCompletedAt = Date.now();

      const evaluation = evaluateQuickSyncRemoteState(remoteFile, {
        fileId: config.fileId,
        lastSyncedAt: config.lastSyncedAt,
        lastKnownRemoteSyncId: deviceMetadata.lastKnownRemoteSyncId,
        lastKnownRemoteHeadRevisionId:
          deviceMetadata.lastKnownRemoteHeadRevisionId,
        lastKnownRemoteVersion: deviceMetadata.lastKnownRemoteVersion,
        lastKnownRemoteModifiedTime: deviceMetadata.lastKnownRemoteModifiedTime,
        lastKnownRemoteFileId: deviceMetadata.lastKnownRemoteFileId,
        deviceId: deviceMetadata.deviceId,
        hasUnsyncedLocalChanges: deviceMetadata.hasUnsyncedLocalChanges,
      });

      if (evaluation.status === "remote_ahead") {
        setQuickSyncRemoteConflict(evaluation.conflict, { openPrompt: true });
        return false;
      }

      if (evaluation.status === "adopt_self") {
        saveQuickSyncConfig({
          fileId: evaluation.remoteFile.id,
          accountEmail: user.email,
          lastSyncedAt: evaluation.remoteFile.modifiedTime,
        });
        updateQuickSyncDeviceMetadata({
          lastKnownRemoteSyncId: evaluation.remoteFile.syncRevisionId,
          lastKnownRemoteHeadRevisionId: evaluation.remoteFile.headRevisionId,
          lastKnownRemoteVersion: evaluation.remoteFile.version,
          lastKnownRemoteModifiedTime: evaluation.remoteFile.modifiedTime,
          lastKnownRemoteFileId: evaluation.remoteFile.id,
        });
        clearQuickSyncRemoteConflict();
        if (!deviceMetadata.hasUnsyncedLocalChanges) {
          setQuickSyncRuntimeStatus("synced");
          return true;
        }
      }
    }

    // 3. Mark syncing
    setQuickSyncRuntimeStatus("syncing");

    // 4. Create database snapshot (unprotected for background auto-sync)
    const archive = await createBackupArchive(null);

    const deviceName = formatQuickSyncDeviceDisplayName(
      deviceMetadata.customDeviceName,
      getQuickSyncHardwareDeviceName(),
    );
    const syncRevisionId = createQuickSyncRevisionId();

    // 5. Upload or update backup file in Google Drive with device attribution
    const backupFile = await withGoogleDriveAccessToken((accessToken) =>
      uploadOrUpdateGoogleDriveQuickSyncBackup(
        accessToken,
        archive.bytes,
        existingFileId,
        {
          deviceId: deviceMetadata.deviceId,
          deviceName,
          syncRevisionId,
        },
      ),
    );
    lastRemoteCheckCompletedAt = Date.now();

    // 6. Update configuration & device-local sync baseline
    const syncedAt = backupFile.modifiedTime || new Date().toISOString();
    saveQuickSyncConfig({
      fileId: backupFile.id,
      accountEmail: user.email,
      lastSyncedAt: syncedAt,
    });
    updateQuickSyncDeviceMetadata({
      lastKnownRemoteSyncId: backupFile.syncRevisionId ?? syncRevisionId,
      lastKnownRemoteHeadRevisionId: backupFile.headRevisionId,
      lastKnownRemoteVersion: backupFile.version,
      lastKnownRemoteModifiedTime: syncedAt,
      lastKnownRemoteFileId: backupFile.id,
      hasUnsyncedLocalChanges: false,
    });
    clearQuickSyncRemoteConflict();

    setQuickSyncRuntimeStatus("synced");
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Quick sync failed.";
    setQuickSyncRuntimeStatus("error", message);
    return false;
  }
}

async function verifyNetworkForQuickSync(
  networkPreference: QuickSyncNetworkPreference,
): Promise<boolean> {
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

  return true;
}

function handleAccountEmailMismatch(
  config: ReturnType<typeof getQuickSyncConfig>,
  userEmail: string | null,
): boolean {
  if (config.accountEmail && userEmail && config.accountEmail !== userEmail) {
    saveQuickSyncConfig({
      enabled: false,
      fileId: null,
      lastSyncedAt: null,
      accountEmail: userEmail,
    });
    clearQuickSyncRemoteTracking();
    clearQuickSyncRemoteConflict();
    setQuickSyncRuntimeStatus("disabled");
    return true;
  }
  return false;
}

registerQuickSyncDebouncedExecutor(() => {
  void triggerQuickSync().catch(() => {
    // Errors are broadcast through QuickSyncState
  });
});
