import Storage from "expo-sqlite/kv-store";
import type { PresetSortBy } from "../types/transaction-preset.types";

const PRESET_SORT_PREFERENCE_KEY = "transactions.presets.sort-preference.v1";

export function readPresetSortPreference(): PresetSortBy {
  try {
    const value = Storage.getItemSync(PRESET_SORT_PREFERENCE_KEY);
    if (value === "last_used_at" || value === "sort_order") {
      return value;
    }
    return "sort_order";
  } catch {
    return "sort_order";
  }
}

export function writePresetSortPreference(sortBy: PresetSortBy): void {
  try {
    Storage.setItemSync(PRESET_SORT_PREFERENCE_KEY, sortBy);
  } catch {
    // In-memory fallback if kv-store is unavailable
  }
}
