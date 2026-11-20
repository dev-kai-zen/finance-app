import type { GoogleDriveQuickSyncMetadata } from "./adapters/google-drive-backup.adapter";
import type { QuickSyncRemoteConflict } from "./types";

/**
 * Clock-skew grace window used only when migrating legacy Quick Sync users
 * who have `lastSyncedAt` saved but do not yet have a `syncRevisionId` or
 * `headRevisionId` baseline.
 */
export const LEGACY_REMOTE_AHEAD_GRACE_MS = 10_000;

export interface QuickSyncLocalBaseline {
  fileId: string | null;
  lastSyncedAt: string | null;
  lastKnownRemoteSyncId: string | null;
  lastKnownRemoteHeadRevisionId: string | null;
  lastKnownRemoteVersion: number | null;
  lastKnownRemoteModifiedTime: string | null;
  lastKnownRemoteFileId: string | null;
  deviceId: string;
  hasUnsyncedLocalChanges: boolean;
}

export type QuickSyncRemoteEvaluation =
  | { status: "missing" }
  | { status: "up_to_date"; remoteFile: GoogleDriveQuickSyncMetadata }
  | { status: "adopt_self"; remoteFile: GoogleDriveQuickSyncMetadata }
  | {
      status: "remote_ahead";
      remoteFile: GoogleDriveQuickSyncMetadata;
      conflict: QuickSyncRemoteConflict;
    };

export function evaluateQuickSyncRemoteState(
  remoteFile: GoogleDriveQuickSyncMetadata | null,
  local: QuickSyncLocalBaseline,
): QuickSyncRemoteEvaluation {
  if (!remoteFile || remoteFile.trashed) {
    return { status: "missing" };
  }

  const isRemoteAhead = detectRemoteAhead(remoteFile, local);
  if (!isRemoteAhead) {
    return { status: "up_to_date", remoteFile };
  }

  // Self-writer protection: this exact device was the last writer on Google Drive.
  // Another device has NOT uploaded since, so never show a self-conflict modal
  // saying "Updated by <this device>". Silently adopt the remote baseline instead.
  if (
    remoteFile.lastUpdatedByDeviceId &&
    remoteFile.lastUpdatedByDeviceId === local.deviceId
  ) {
    return { status: "adopt_self", remoteFile };
  }

  return {
    status: "remote_ahead",
    remoteFile,
    conflict: {
      fileId: remoteFile.id,
      remoteVersion: remoteFile.version,
      remoteModifiedTime: remoteFile.modifiedTime,
      remoteDeviceId: remoteFile.lastUpdatedByDeviceId,
      remoteDeviceName: remoteFile.lastUpdatedByDeviceName,
      localLastSyncedAt: local.lastSyncedAt ?? local.lastKnownRemoteModifiedTime,
      hasUnsyncedLocalChanges: local.hasUnsyncedLocalChanges,
    },
  };
}

function detectRemoteAhead(
  remoteFile: GoogleDriveQuickSyncMetadata,
  local: QuickSyncLocalBaseline,
): boolean {
  const knownFileId = local.lastKnownRemoteFileId ?? local.fileId;
  const hasNeverSynced =
    local.lastKnownRemoteSyncId === null &&
    local.lastKnownRemoteHeadRevisionId === null &&
    local.lastKnownRemoteVersion === null &&
    local.lastKnownRemoteModifiedTime === null &&
    local.lastSyncedAt === null;

  // Freshly linked / second device where a Drive Quick Sync file already exists
  if (hasNeverSynced) {
    return true;
  }

  // Another device replaced/recreated the Drive file under a different fileId
  if (knownFileId && remoteFile.id !== knownFileId) {
    return true;
  }

  // Primary #1: App-stamped syncRevisionId (UUID written into Drive appProperties
  // on every Quick Sync upload). Immune to Google Drive internal version bumps.
  if (remoteFile.syncRevisionId && local.lastKnownRemoteSyncId) {
    return remoteFile.syncRevisionId !== local.lastKnownRemoteSyncId;
  }

  // Primary #2: Drive content headRevisionId (only changes when file bytes change).
  if (remoteFile.headRevisionId && local.lastKnownRemoteHeadRevisionId) {
    return remoteFile.headRevisionId !== local.lastKnownRemoteHeadRevisionId;
  }

  // Legacy migration fallback before a syncRevisionId/headRevisionId baseline exists:
  // compare Drive server modifiedTime against local baseline timestamp.
  const localBaselineTimestamp =
    local.lastKnownRemoteModifiedTime ?? local.lastSyncedAt;
  if (!localBaselineTimestamp) {
    return true;
  }

  const remoteMs = Date.parse(remoteFile.modifiedTime);
  const localMs = Date.parse(localBaselineTimestamp);
  if (Number.isNaN(remoteMs) || Number.isNaN(localMs)) {
    return false;
  }

  return remoteMs > localMs + LEGACY_REMOTE_AHEAD_GRACE_MS;
}
