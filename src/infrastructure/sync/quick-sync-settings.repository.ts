import { inArray } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import type {
  QuickSyncConfig,
  QuickSyncNetworkPreference,
} from "./types";

export const QUICK_SYNC_ENABLED_KEY = "quick_sync_enabled";
export const QUICK_SYNC_NETWORK_KEY = "quick_sync_network";
export const QUICK_SYNC_LAST_SYNCED_AT_KEY = "quick_sync_last_synced_at";
export const QUICK_SYNC_FILE_ID_KEY = "quick_sync_file_id";

export const QUICK_SYNC_SETTINGS_KEYS = [
  QUICK_SYNC_ENABLED_KEY,
  QUICK_SYNC_NETWORK_KEY,
  QUICK_SYNC_LAST_SYNCED_AT_KEY,
  QUICK_SYNC_FILE_ID_KEY,
] as const;

type SettingsListener = () => void;
const listeners = new Set<SettingsListener>();

export function subscribeToQuickSyncSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySettingsChange(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
}

export function getQuickSyncConfig(context: DbContext = db): QuickSyncConfig {
  const rows = context
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...QUICK_SYNC_SETTINGS_KEYS]))
    .all();

  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]));

  return {
    enabled: values[QUICK_SYNC_ENABLED_KEY] === "true",
    network: normalizeNetworkPreference(values[QUICK_SYNC_NETWORK_KEY]),
    lastSyncedAt: values[QUICK_SYNC_LAST_SYNCED_AT_KEY] || null,
    fileId: values[QUICK_SYNC_FILE_ID_KEY] || null,
  };
}

export function saveQuickSyncConfig(
  patch: Partial<QuickSyncConfig>,
  context: DbContext = db,
): void {
  const updatedAt = new Date();
  const entries: Record<string, string | null> = {};

  if (patch.enabled !== undefined) {
    entries[QUICK_SYNC_ENABLED_KEY] = String(patch.enabled);
  }
  if (patch.network !== undefined) {
    entries[QUICK_SYNC_NETWORK_KEY] = patch.network;
  }
  if (patch.lastSyncedAt !== undefined) {
    entries[QUICK_SYNC_LAST_SYNCED_AT_KEY] = patch.lastSyncedAt;
  }
  if (patch.fileId !== undefined) {
    entries[QUICK_SYNC_FILE_ID_KEY] = patch.fileId;
  }

  Object.entries(entries).forEach(([key, value]) => {
    if (value === null || value === "") {
      context.delete(settings).where(inArray(settings.key, [key])).run();
    } else {
      context
        .insert(settings)
        .values({ key, value, updatedAt })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt },
        })
        .run();
    }
  });

  notifySettingsChange();
}

function normalizeNetworkPreference(
  value: string | undefined,
): QuickSyncNetworkPreference {
  return value === "any" ? "any" : "wifi_only";
}
