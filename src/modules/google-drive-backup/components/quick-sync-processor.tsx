import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  addDatabaseChangeListener,
  type DatabaseChangeEvent,
} from "expo-sqlite";

import {
  isDatabaseReplacing,
  QUICK_SYNC_WATCHED_TABLE_NAME_SET,
} from "@/infrastructure/database";
import {
  flushDebouncedQuickSync,
  queueDebouncedQuickSync,
} from "@/infrastructure/sync";
import { isPersonalWorkspace } from "@/modules/onboarding";
import { appLockLifecycle } from "@/modules/security";

import { getQuickSyncConfig } from "../repositories/quick-sync-settings.repository";
import { checkQuickSyncRemoteStatus } from "../services/quick-sync.service";
import { QuickSyncConflictModal } from "./quick-sync-conflict-modal";

function shouldQueueQuickSyncForDatabaseChange(
  event: DatabaseChangeEvent,
): boolean {
  if (isDatabaseReplacing() || !isPersonalWorkspace()) {
    return false;
  }
  return QUICK_SYNC_WATCHED_TABLE_NAME_SET.has(event.tableName);
}

const QUICK_SYNC_RESUME_DELAY_MS = 1500;

export function QuickSyncProcessor() {
  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let latestNetState: { isConnected: boolean | null; type: string } | null =
      null;
    let pendingLockedCheck: {
      requireNetworkMatch: boolean;
      force: boolean;
    } | null = null;
    let wasAppLocked = appLockLifecycle.getIsLocked();

    const clearPendingResumeTimer = () => {
      if (resumeTimer !== null) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
    };

    const scheduleDeferredRemoteCheck = (
      requireNetworkMatch: boolean,
      force = false,
    ) => {
      clearPendingResumeTimer();
      if (appLockLifecycle.getIsLocked()) {
        pendingLockedCheck = {
          requireNetworkMatch:
            pendingLockedCheck !== null
              ? pendingLockedCheck.requireNetworkMatch && requireNetworkMatch
              : requireNetworkMatch,
          force: Boolean(pendingLockedCheck?.force || force),
        };
        return;
      }

      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        if (appLockLifecycle.getIsLocked()) {
          pendingLockedCheck = {
            requireNetworkMatch:
              pendingLockedCheck !== null
                ? pendingLockedCheck.requireNetworkMatch && requireNetworkMatch
                : requireNetworkMatch,
            force: Boolean(pendingLockedCheck?.force || force),
          };
          return;
        }
        const config = getQuickSyncConfig();
        if (!config.enabled) {
          return;
        }
        if (requireNetworkMatch && latestNetState) {
          if (
            !latestNetState.isConnected ||
            (config.network !== "any" &&
              latestNetState.type !== "wifi" &&
              latestNetState.type !== "ethernet")
          ) {
            return;
          }
        }
        void checkQuickSyncRemoteStatus({
          config,
          force,
          openPromptOnConflict: true,
        });
      }, QUICK_SYNC_RESUME_DELAY_MS);
    };

    // Proactive startup check: detects if another device uploaded a newer
    // Quick Sync file before the user starts encoding new changes locally.
    scheduleDeferredRemoteCheck(false, true);

    const unsubscribeAppLock = appLockLifecycle.subscribe((isLocked) => {
      if (isLocked) {
        wasAppLocked = true;
        if (resumeTimer !== null && pendingLockedCheck === null) {
          pendingLockedCheck = {
            requireNetworkMatch: false,
            force: false,
          };
        }
        clearPendingResumeTimer();
        return;
      }

      if (wasAppLocked) {
        wasAppLocked = false;
        const deferred = pendingLockedCheck ?? {
          requireNetworkMatch: false,
          force: false,
        };
        pendingLockedCheck = null;
        scheduleDeferredRemoteCheck(
          deferred.requireNetworkMatch,
          deferred.force,
        );
      }
    });

    const dbSubscription = addDatabaseChangeListener((event) => {
      if (!shouldQueueQuickSyncForDatabaseChange(event)) {
        return;
      }

      queueDebouncedQuickSync();
    });

    const netInfoSubscription = NetInfo.addEventListener((netState) => {
      const wasDisconnected = latestNetState?.isConnected === false;
      latestNetState = {
        isConnected: netState.isConnected,
        type: netState.type,
      };
      if (netState.isConnected) {
        scheduleDeferredRemoteCheck(true, wasDisconnected);
      }
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "background" || nextState === "inactive") {
          clearPendingResumeTimer();
          flushDebouncedQuickSync();
        } else if (nextState === "active") {
          scheduleDeferredRemoteCheck(false, false);
        }
      },
    );

    return () => {
      clearPendingResumeTimer();
      unsubscribeAppLock();
      dbSubscription.remove();
      netInfoSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return <QuickSyncConflictModal />;
}
