import { useEffect, useState } from "react";
import {
  getQuickSyncConfig,
  subscribeToQuickSyncSettings,
} from "./quick-sync-settings.repository";
import type {
  QuickSyncState,
  QuickSyncStatus,
} from "./types";

type QuickSyncListener = (state: QuickSyncState) => void;

let currentStatus: QuickSyncStatus = "idle";
let lastErrorMessage: string | null = null;
let idleResetTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<QuickSyncListener>();

export function getQuickSyncState(): QuickSyncState {
  const config = getQuickSyncConfig();
  const status: QuickSyncStatus = !config.enabled
    ? "disabled"
    : currentStatus;

  return {
    enabled: config.enabled,
    status,
    networkPreference: config.network,
    lastSyncedAt: config.lastSyncedAt,
    lastError: lastErrorMessage,
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

export function resetQuickSyncStateForTests(): void {
  if (idleResetTimer) {
    clearTimeout(idleResetTimer);
    idleResetTimer = null;
  }
  currentStatus = "idle";
  lastErrorMessage = null;
}

export function useQuickSyncStatus(): QuickSyncState {
  const [state, setState] = useState<QuickSyncState>(getQuickSyncState);

  useEffect(() => {
    return subscribeToQuickSync(setState);
  }, []);

  return state;
}
