import { eq } from "drizzle-orm";
import Storage from "expo-sqlite/kv-store";

import {
  DEFAULT_CUSTOM_THEME_CONFIG,
  isCustomThemeConfig,
  type CustomThemeConfig,
  type ThemeSelection,
} from "@/constants/theme";
import { db } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import { queueDebouncedQuickSync } from "@/infrastructure/sync/quick-sync-debounce";

export const THEME_SELECTION_KEY = "appearance.theme-selection.v1";
export const CUSTOM_THEME_CONFIG_KEY = "appearance.custom-theme-config.v1";

function readSettingRowFromDb(key: string): string | null {
  try {
    const row = db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .get();
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function upsertSettingRowInDb(key: string, value: string): void {
  try {
    const updatedAt = new Date();
    db.insert(settings)
      .values({ key, value, updatedAt })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt },
      })
      .run();
  } catch {
    // Ignore if DB migration hasn't run yet on initial cold start
  }
}

function isThemeSelection(value: unknown): value is ThemeSelection {
  if (!value || typeof value !== "object") return false;

  const selection = value as Partial<ThemeSelection> & {
    presetId?: unknown;
    config?: unknown;
  };
  if (selection.kind === "system") return true;
  if (selection.kind === "custom") {
    return isCustomThemeConfig(selection.config);
  }

  return selection.kind === "preset" && typeof selection.presetId === "string";
}

export function readThemeSelection(): ThemeSelection | null {
  try {
    const dbValue = readSettingRowFromDb(THEME_SELECTION_KEY);
    if (dbValue) {
      const parsedDb: unknown = JSON.parse(dbValue);
      if (isThemeSelection(parsedDb)) {
        try {
          Storage.setItemSync(THEME_SELECTION_KEY, dbValue);
        } catch {
          // Ignore KV mirror failure
        }
        return parsedDb;
      }
    }

    const storedValue = Storage.getItemSync(THEME_SELECTION_KEY);
    if (!storedValue) return null;

    const parsedValue: unknown = JSON.parse(storedValue);
    if (isThemeSelection(parsedValue)) {
      upsertSettingRowInDb(THEME_SELECTION_KEY, storedValue);
      return parsedValue;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeThemeSelection(selection: ThemeSelection): void {
  const serializedSelection = JSON.stringify(selection);
  try {
    Storage.setItemSync(THEME_SELECTION_KEY, serializedSelection);
    if (selection.kind === "custom") {
      Storage.setItemSync(
        CUSTOM_THEME_CONFIG_KEY,
        JSON.stringify(selection.config),
      );
    }
  } catch {
    // Theme changes remain usable in memory if KV storage is unavailable.
  }

  upsertSettingRowInDb(THEME_SELECTION_KEY, serializedSelection);
  if (selection.kind === "custom") {
    upsertSettingRowInDb(
      CUSTOM_THEME_CONFIG_KEY,
      JSON.stringify(selection.config),
    );
  }
  queueDebouncedQuickSync([THEME_SELECTION_KEY, CUSTOM_THEME_CONFIG_KEY]);
}

export function readSavedCustomThemeConfig(): CustomThemeConfig {
  try {
    const dbValue = readSettingRowFromDb(CUSTOM_THEME_CONFIG_KEY);
    if (dbValue) {
      const parsedDb: unknown = JSON.parse(dbValue);
      if (isCustomThemeConfig(parsedDb)) {
        try {
          Storage.setItemSync(CUSTOM_THEME_CONFIG_KEY, dbValue);
        } catch {
          // Ignore KV mirror failure
        }
        return parsedDb;
      }
    }

    const storedValue = Storage.getItemSync(CUSTOM_THEME_CONFIG_KEY);
    if (!storedValue) return DEFAULT_CUSTOM_THEME_CONFIG;

    const parsedValue: unknown = JSON.parse(storedValue);
    if (isCustomThemeConfig(parsedValue)) {
      upsertSettingRowInDb(CUSTOM_THEME_CONFIG_KEY, storedValue);
      return parsedValue;
    }
    return DEFAULT_CUSTOM_THEME_CONFIG;
  } catch {
    return DEFAULT_CUSTOM_THEME_CONFIG;
  }
}

export function writeSavedCustomThemeConfig(config: CustomThemeConfig): void {
  const serialized = JSON.stringify(config);
  try {
    Storage.setItemSync(CUSTOM_THEME_CONFIG_KEY, serialized);
  } catch {
    // Ignore KV storage write failure
  }
  upsertSettingRowInDb(CUSTOM_THEME_CONFIG_KEY, serialized);
  queueDebouncedQuickSync([CUSTOM_THEME_CONFIG_KEY]);
}
