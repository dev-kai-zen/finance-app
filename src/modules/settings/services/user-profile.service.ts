import type { DbContext } from "@/infrastructure/database/client";
import { USER_NICKNAME_SETTING_KEY } from "../constants/settings.constants";
import {
  getSettingByKey,
  saveSettingsEntries,
} from "../repositories/settings.repository";

type UserProfileListener = () => void;
const listeners = new Set<UserProfileListener>();

export function subscribeToUserNickname(
  listener: UserProfileListener,
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

export function getUserNickname(context?: DbContext): string | null {
  const value = getSettingByKey(USER_NICKNAME_SETTING_KEY, context);
  if (!value || !value.trim()) {
    return null;
  }
  return value.trim();
}

export function setUserNickname(
  nickname: string | null,
  context?: DbContext,
  now = new Date(),
): void {
  const trimmed = nickname?.trim();
  saveSettingsEntries(
    {
      [USER_NICKNAME_SETTING_KEY]: trimmed && trimmed.length > 0 ? trimmed : null,
    },
    context,
    now,
  );
  notifyListeners();
}
