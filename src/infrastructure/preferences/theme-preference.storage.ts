import Storage from "expo-sqlite/kv-store";

import type { ThemeSelection } from "@/constants/theme";

const THEME_SELECTION_KEY = "appearance.theme-selection.v1";

function isThemeSelection(value: unknown): value is ThemeSelection {
  if (!value || typeof value !== "object") return false;

  const selection = value as Partial<ThemeSelection> & { presetId?: unknown };
  if (selection.kind === "system") return true;

  return selection.kind === "preset" && typeof selection.presetId === "string";
}

export function readThemeSelection(): ThemeSelection | null {
  try {
    const storedValue = Storage.getItemSync(THEME_SELECTION_KEY);
    if (!storedValue) return null;

    const parsedValue: unknown = JSON.parse(storedValue);
    return isThemeSelection(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function writeThemeSelection(selection: ThemeSelection): void {
  try {
    Storage.setItemSync(THEME_SELECTION_KEY, JSON.stringify(selection));
  } catch {
    // Theme changes remain usable in memory if device storage is unavailable.
  }
}
