import { randomUUID } from "expo-crypto";
import * as Device from "expo-device";
import { File, Paths } from "expo-file-system";

import type { QuickSyncDeviceMetadata } from "./types";

const DEVICE_METADATA_FILENAME = "quick-sync-device.json";
const MAX_CUSTOM_LABEL_LENGTH = 40;
const MAX_DRIVE_DEVICE_NAME_LENGTH = 60;
const GENERIC_DEVICE_NAMES = new Set([
  "this device",
  "android",
  "ios",
  "ipados",
  "web",
]);

type DeviceMetadataListener = () => void;

const listeners = new Set<DeviceMetadataListener>();
let cachedMetadata: QuickSyncDeviceMetadata | null = null;
let cachedHardwareDeviceName: string | null = null;
let localChangeGeneration = 0;

export function getQuickSyncLocalChangeGeneration(): number {
  return localChangeGeneration;
}

export function subscribeToQuickSyncDeviceMetadata(
  listener: DeviceMetadataListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyDeviceMetadataChange(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
}

export function getQuickSyncHardwareDeviceName(): string {
  if (cachedHardwareDeviceName !== null) {
    return cachedHardwareDeviceName;
  }

  const brand = normalizeLabelPart(Device?.brand);
  const modelName = normalizeLabelPart(Device?.modelName);
  const osName = normalizeLabelPart(Device?.osName);

  let resolved = "This Device";
  if (modelName) {
    const brandLower = brand?.toLowerCase() ?? "";
    const modelLower = modelName.toLowerCase();
    if (
      brand &&
      brandLower !== "apple" &&
      !modelLower.startsWith(brandLower)
    ) {
      resolved = `${formatBrandName(brand)} ${modelName}`;
    } else {
      resolved = modelName;
    }
  } else if (brand) {
    resolved = formatBrandName(brand);
  } else if (osName) {
    resolved = osName;
  }

  cachedHardwareDeviceName = resolved.slice(0, MAX_DRIVE_DEVICE_NAME_LENGTH);
  return cachedHardwareDeviceName;
}

export function sanitizeQuickSyncCustomDeviceName(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CUSTOM_LABEL_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export function formatQuickSyncDeviceDisplayName(
  customDeviceName: string | null,
  hardwareDeviceName: string = getQuickSyncHardwareDeviceName(),
): string {
  const custom = sanitizeQuickSyncCustomDeviceName(customDeviceName);
  const hardware =
    normalizeLabelPart(hardwareDeviceName) ?? "This Device";

  if (!custom) {
    return hardware.slice(0, MAX_DRIVE_DEVICE_NAME_LENGTH);
  }

  const hardwareLower = hardware.toLowerCase();
  const isSpecificHardware =
    !GENERIC_DEVICE_NAMES.has(hardwareLower) &&
    !custom.toLowerCase().includes(hardwareLower);

  if (isSpecificHardware) {
    const combined = `${custom} (${hardware})`;
    if (combined.length <= MAX_DRIVE_DEVICE_NAME_LENGTH) {
      return combined;
    }
  }

  return custom.slice(0, MAX_DRIVE_DEVICE_NAME_LENGTH);
}

export function createQuickSyncRevisionId(): string {
  return generateUniqueId("rev");
}

export function getQuickSyncDeviceMetadata(): QuickSyncDeviceMetadata {
  if (cachedMetadata) {
    return { ...cachedMetadata };
  }

  const loaded = readDeviceMetadataFromDisk();
  if (loaded) {
    cachedMetadata = loaded;
    return { ...cachedMetadata };
  }

  const initial: QuickSyncDeviceMetadata = {
    deviceId: generateUniqueId("device"),
    customDeviceName: null,
    lastKnownRemoteSyncId: null,
    lastKnownRemoteHeadRevisionId: null,
    lastKnownRemoteVersion: null,
    lastKnownRemoteModifiedTime: null,
    lastKnownRemoteFileId: null,
    hasUnsyncedLocalChanges: false,
  };
  cachedMetadata = initial;
  writeDeviceMetadataToDisk(initial);
  return { ...cachedMetadata };
}

export function updateQuickSyncDeviceMetadata(
  patch: Partial<Omit<QuickSyncDeviceMetadata, "deviceId">>,
): QuickSyncDeviceMetadata {
  const current = getQuickSyncDeviceMetadata();
  const next: QuickSyncDeviceMetadata = {
    ...current,
    ...(patch.customDeviceName !== undefined
      ? { customDeviceName: sanitizeQuickSyncCustomDeviceName(patch.customDeviceName) }
      : {}),
    ...(patch.lastKnownRemoteSyncId !== undefined
      ? { lastKnownRemoteSyncId: patch.lastKnownRemoteSyncId }
      : {}),
    ...(patch.lastKnownRemoteHeadRevisionId !== undefined
      ? { lastKnownRemoteHeadRevisionId: patch.lastKnownRemoteHeadRevisionId }
      : {}),
    ...(patch.lastKnownRemoteVersion !== undefined
      ? {
          lastKnownRemoteVersion:
            typeof patch.lastKnownRemoteVersion === "number" &&
            Number.isFinite(patch.lastKnownRemoteVersion)
              ? patch.lastKnownRemoteVersion
              : null,
        }
      : {}),
    ...(patch.lastKnownRemoteModifiedTime !== undefined
      ? { lastKnownRemoteModifiedTime: patch.lastKnownRemoteModifiedTime }
      : {}),
    ...(patch.lastKnownRemoteFileId !== undefined
      ? { lastKnownRemoteFileId: patch.lastKnownRemoteFileId }
      : {}),
    ...(patch.hasUnsyncedLocalChanges !== undefined
      ? { hasUnsyncedLocalChanges: Boolean(patch.hasUnsyncedLocalChanges) }
      : {}),
  };

  if (isSameDeviceMetadata(current, next)) {
    return { ...current };
  }

  cachedMetadata = next;
  writeDeviceMetadataToDisk(next);
  notifyDeviceMetadataChange();
  return { ...next };
}

export function markQuickSyncLocalChangesPending(): boolean {
  localChangeGeneration += 1;
  const current = getQuickSyncDeviceMetadata();
  if (current.hasUnsyncedLocalChanges) {
    return false;
  }

  updateQuickSyncDeviceMetadata({ hasUnsyncedLocalChanges: true });
  return true;
}

export function setQuickSyncCustomDeviceName(
  label: string | null,
): QuickSyncDeviceMetadata {
  return updateQuickSyncDeviceMetadata({
    customDeviceName: sanitizeQuickSyncCustomDeviceName(label),
  });
}

export function clearQuickSyncRemoteTracking(): void {
  updateQuickSyncDeviceMetadata({
    lastKnownRemoteSyncId: null,
    lastKnownRemoteHeadRevisionId: null,
    lastKnownRemoteVersion: null,
    lastKnownRemoteModifiedTime: null,
    lastKnownRemoteFileId: null,
    hasUnsyncedLocalChanges: false,
  });
}

export function resetQuickSyncDeviceIdentityForAppReset(): QuickSyncDeviceMetadata {
  const current = getQuickSyncDeviceMetadata();
  let nextDeviceId = generateUniqueId("device");
  if (nextDeviceId === current.deviceId) {
    nextDeviceId = `${nextDeviceId}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  const next: QuickSyncDeviceMetadata = {
    deviceId: nextDeviceId,
    customDeviceName: null,
    lastKnownRemoteSyncId: null,
    lastKnownRemoteHeadRevisionId: null,
    lastKnownRemoteVersion: null,
    lastKnownRemoteModifiedTime: null,
    lastKnownRemoteFileId: null,
    hasUnsyncedLocalChanges: false,
  };

  cachedMetadata = next;
  writeDeviceMetadataToDisk(next);
  notifyDeviceMetadataChange();
  return { ...next };
}

export function resetQuickSyncDeviceMetadataForTests(
  overrides?: Partial<QuickSyncDeviceMetadata>,
): void {
  cachedHardwareDeviceName = null;
  localChangeGeneration = 0;
  cachedMetadata = overrides
    ? {
        deviceId: overrides.deviceId ?? "test-device-id",
        customDeviceName: sanitizeQuickSyncCustomDeviceName(
          overrides.customDeviceName,
        ),
        lastKnownRemoteSyncId: overrides.lastKnownRemoteSyncId ?? null,
        lastKnownRemoteHeadRevisionId:
          overrides.lastKnownRemoteHeadRevisionId ?? null,
        lastKnownRemoteVersion: overrides.lastKnownRemoteVersion ?? null,
        lastKnownRemoteModifiedTime:
          overrides.lastKnownRemoteModifiedTime ?? null,
        lastKnownRemoteFileId: overrides.lastKnownRemoteFileId ?? null,
        hasUnsyncedLocalChanges: overrides.hasUnsyncedLocalChanges ?? false,
      }
    : null;
}

function getMetadataFile(): File | null {
  try {
    if (process.env.EXPO_OS === "web") return null;
    if (typeof File !== "function" || !Paths?.document) return null;
    return new File(Paths.document, DEVICE_METADATA_FILENAME);
  } catch {
    return null;
  }
}

function readDeviceMetadataFromDisk(): QuickSyncDeviceMetadata | null {
  try {
    const file = getMetadataFile();
    if (!file || !file.exists || typeof file.textSync !== "function") {
      return null;
    }
    const raw = file.textSync();
    if (typeof raw !== "string" || raw.trim().length === 0) return null;
    const parsed = JSON.parse(raw) as Partial<QuickSyncDeviceMetadata>;
    const deviceId =
      typeof parsed.deviceId === "string" && parsed.deviceId.trim().length > 0
        ? parsed.deviceId.trim()
        : generateUniqueId("device");

    return {
      deviceId,
      customDeviceName: sanitizeQuickSyncCustomDeviceName(
        parsed.customDeviceName,
      ),
      lastKnownRemoteSyncId:
        typeof parsed.lastKnownRemoteSyncId === "string" &&
        parsed.lastKnownRemoteSyncId.length > 0
          ? parsed.lastKnownRemoteSyncId
          : null,
      lastKnownRemoteHeadRevisionId:
        typeof parsed.lastKnownRemoteHeadRevisionId === "string" &&
        parsed.lastKnownRemoteHeadRevisionId.length > 0
          ? parsed.lastKnownRemoteHeadRevisionId
          : null,
      lastKnownRemoteVersion:
        typeof parsed.lastKnownRemoteVersion === "number" &&
        Number.isFinite(parsed.lastKnownRemoteVersion)
          ? parsed.lastKnownRemoteVersion
          : null,
      lastKnownRemoteModifiedTime:
        typeof parsed.lastKnownRemoteModifiedTime === "string" &&
        parsed.lastKnownRemoteModifiedTime.length > 0
          ? parsed.lastKnownRemoteModifiedTime
          : null,
      lastKnownRemoteFileId:
        typeof parsed.lastKnownRemoteFileId === "string" &&
        parsed.lastKnownRemoteFileId.length > 0
          ? parsed.lastKnownRemoteFileId
          : null,
      hasUnsyncedLocalChanges: Boolean(parsed.hasUnsyncedLocalChanges),
    };
  } catch {
    return null;
  }
}

function writeDeviceMetadataToDisk(metadata: QuickSyncDeviceMetadata): void {
  try {
    const file = getMetadataFile();
    if (!file || typeof file.write !== "function") return;
    if (typeof file.create === "function") {
      file.create({ intermediates: true, overwrite: true });
    }
    file.write(JSON.stringify(metadata));
  } catch {
    // Non-fatal: in-memory metadata still guards current session
  }
}

function generateUniqueId(prefix: string): string {
  try {
    if (typeof randomUUID === "function") {
      const value = randomUUID();
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
  } catch {
    // Fall through to deterministic-safe random fallback
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeLabelPart(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatBrandName(brand: string): string {
  if (brand === brand.toLowerCase()) {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  }
  return brand;
}

function isSameDeviceMetadata(
  left: QuickSyncDeviceMetadata,
  right: QuickSyncDeviceMetadata,
): boolean {
  return (
    left.deviceId === right.deviceId &&
    left.customDeviceName === right.customDeviceName &&
    left.lastKnownRemoteSyncId === right.lastKnownRemoteSyncId &&
    left.lastKnownRemoteHeadRevisionId === right.lastKnownRemoteHeadRevisionId &&
    left.lastKnownRemoteVersion === right.lastKnownRemoteVersion &&
    left.lastKnownRemoteModifiedTime === right.lastKnownRemoteModifiedTime &&
    left.lastKnownRemoteFileId === right.lastKnownRemoteFileId &&
    left.hasUnsyncedLocalChanges === right.hasUnsyncedLocalChanges
  );
}
