import { useEffect, useState } from "react";
import {
  formatQuickSyncDeviceDisplayName,
  getQuickSyncDeviceMetadata,
  getQuickSyncHardwareDeviceName,
  subscribeToQuickSyncDeviceMetadata,
} from "./quick-sync-device.storage";
import {
  getQuickSyncConfig,
  subscribeToQuickSyncSettings,
} from "./quick-sync-settings.repository";
import type {
  QuickSyncRemoteConflict,
  QuickSyncState,
  QuickSyncStatus,
} from "./types";

type QuickSyncListener = (state: QuickSyncState) => void;

let currentStatus: QuickSyncStatus = "idle";
let lastErrorMessage: string | null = null;
let remoteConflict: QuickSyncRemoteConflict | null = null;
let conflictPromptVisible = false;
let idleResetTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<QuickSyncListener>();

export function getQuickSyncState(): QuickSyncState {
  const config = getQuickSyncConfig();
  const deviceMetadata = getQuickSyncDeviceMetadata();
  const hardwareDeviceName = getQuickSyncHardwareDeviceName();
  const deviceLabel = formatQuickSyncDeviceDisplayName(
    deviceMetadata.customDeviceName,
    hardwareDeviceName,
  );
  const activeConflict = config.enabled ? remoteConflict : null;
  const status: QuickSyncStatus = !config.enabled
    ? "disabled"
    : currentStatus === "syncing"
      ? "syncing"
      : activeConflict !== null
        ? "remote_ahead"
        : currentStatus;

  return {
    enabled: config.enabled,
    status,
    networkPreference: config.network,
    lastSyncedAt: config.lastSyncedAt,
    fileId: config.fileId,
    accountEmail: config.accountEmail ?? null,
    lastError: lastErrorMessage,
    remoteConflict: activeConflict
      ? {
          ...activeConflict,
          hasUnsyncedLocalChanges: deviceMetadata.hasUnsyncedLocalChanges,
        }
      : null,
    conflictPromptVisible: activeConflict !== null && conflictPromptVisible,
    hasUnsyncedLocalChanges: deviceMetadata.hasUnsyncedLocalChanges,
    deviceLabel,
    customDeviceName: deviceMetadata.customDeviceName,
    hardwareDeviceName,
  };
}

export function subscribeToQuickSync(listener: QuickSyncListener): () => void {
  listeners.add(listener);
  listener(getQuickSyncState());

  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(): void {
  const state = getQuickSyncState();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // Ignore listener errors
    }
  });
}

subscribeToQuickSyncSettings(() => {
  notifySubscribers();
});

subscribeToQuickSyncDeviceMetadata(() => {
  notifySubscribers();
});

export function setQuickSyncRuntimeStatus(
  status: QuickSyncStatus,
  errorMessage: string | null = null,
): void {
  if (idleResetTimer) {
    clearTimeout(idleResetTimer);
    idleResetTimer = null;
  }

  currentStatus = status;
  lastErrorMessage = errorMessage;
  notifySubscribers();

  if (status === "synced") {
    idleResetTimer = setTimeout(() => {
      if (currentStatus === "synced") {
        currentStatus = "idle";
        notifySubscribers();
      }
    }, 4000);
  }
}

export function setQuickSyncRemoteConflict(
  conflict: QuickSyncRemoteConflict | null,
  options?: { openPrompt?: boolean },
): void {
  if (idleResetTimer) {
    clearTimeout(idleResetTimer);
    idleResetTimer = null;
  }

  remoteConflict = conflict;
  if (!conflict) {
    conflictPromptVisible = false;
    if (currentStatus === "remote_ahead") {
      currentStatus = "idle";
    }
  } else {
    lastErrorMessage = null;
    if (options?.openPrompt !== undefined) {
      conflictPromptVisible = options.openPrompt;
    } else {
      conflictPromptVisible = true;
    }
  }
  notifySubscribers();
}

export function setQuickSyncConflictPromptVisible(visible: boolean): void {
  const nextVisible = visible && remoteConflict !== null;
  if (conflictPromptVisible === nextVisible) {
    return;
  }
  conflictPromptVisible = nextVisible;
  notifySubscribers();
}

export function clearQuickSyncRemoteConflict(): void {
  setQuickSyncRemoteConflict(null);
}

export function resetQuickSyncStateForTests(): void {
  if (idleResetTimer) {
    clearTimeout(idleResetTimer);
    idleResetTimer = null;
  }
  currentStatus = "idle";
  lastErrorMessage = null;
  remoteConflict = null;
  conflictPromptVisible = false;
}

export function useQuickSyncStatus(): QuickSyncState {
  const [state, setState] = useState<QuickSyncState>(getQuickSyncState);

  useEffect(() => {
    return subscribeToQuickSync(setState);
  }, []);

  return state;
}
