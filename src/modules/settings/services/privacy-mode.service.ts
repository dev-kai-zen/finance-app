import type { DbContext } from "@/infrastructure/database/client";
import { PRIVACY_MODE_SETTING_KEY } from "../constants/settings.constants";
import { getSettingByKey } from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

type PrivacyModeListener = (isPrivate: boolean) => void;
const listeners = new Set<PrivacyModeListener>();

let cachedPrivacyMode: boolean | null = null;

export function subscribeToPrivacyModeSetting(
  listener: PrivacyModeListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(isPrivate: boolean): void {
  listeners.forEach((listener) => {
    try {
      listener(isPrivate);
    } catch {
      // Ignore listener error
    }
  });
}

export function getPrivacyModeSetting(context?: DbContext): boolean {
  if (cachedPrivacyMode !== null && !context) {
    return cachedPrivacyMode;
  }
  const value = getSettingByKey(PRIVACY_MODE_SETTING_KEY, context);
  const isPrivate = value === "true";
  if (!context) {
    cachedPrivacyMode = isPrivate;
  }
  return isPrivate;
}

export function setPrivacyModeSetting(
  enabled: boolean,
  context?: DbContext,
  now = new Date(),
): void {
  cachedPrivacyMode = enabled;
  persistSettingsEntries(
    { [PRIVACY_MODE_SETTING_KEY]: enabled ? "true" : "false" },
    context,
    now,
  );
  notifyListeners(enabled);
}

export function formatPrivacyAmount(amount: string, isPrivate: boolean): string {
  if (isPrivate) {
    return "••••••";
  }
  return amount;
}

