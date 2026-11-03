import type { DbContext } from "@/infrastructure/database/client";
import { GESTURE_SHAKE_ACTION_SETTING_KEY } from "../constants/settings.constants";
import { getSettingByKey } from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

export type ShakeAction = "chat_with_kai" | "manual_entry" | "disabled";

type GestureSettingsListener = () => void;
const listeners = new Set<GestureSettingsListener>();

export function subscribeToShakeActionSetting(
  listener: GestureSettingsListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

export function getShakeActionSetting(context?: DbContext): ShakeAction {
  const value = getSettingByKey(GESTURE_SHAKE_ACTION_SETTING_KEY, context);
  if (value === "manual_entry" || value === "disabled" || value === "chat_with_kai") {
    return value;
  }
  return "disabled";
}

export function setShakeActionSetting(
  action: ShakeAction,
  context?: DbContext,
  now = new Date(),
): void {
  persistSettingsEntries(
    { [GESTURE_SHAKE_ACTION_SETTING_KEY]: action },
    context,
    now,
  );
  notifyListeners();
}

