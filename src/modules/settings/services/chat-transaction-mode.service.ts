import type { DbContext } from "@/infrastructure/database/client";
import { CHAT_TRANSACTION_MODE_SETTING_KEY } from "../constants/settings.constants";
import { getSettingByKey } from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

export type ChatTransactionMode = "review" | "auto";

type ChatTransactionModeListener = () => void;
const listeners = new Set<ChatTransactionModeListener>();

export function subscribeToChatTransactionMode(
  listener: ChatTransactionModeListener,
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

export function getChatTransactionMode(
  context?: DbContext,
): ChatTransactionMode {
  const value = getSettingByKey(CHAT_TRANSACTION_MODE_SETTING_KEY, context);
  return value === "auto" ? "auto" : "review";
}

export function setChatTransactionMode(
  mode: ChatTransactionMode,
  context?: DbContext,
  now = new Date(),
): void {
  persistSettingsEntries(
    { [CHAT_TRANSACTION_MODE_SETTING_KEY]: mode },
    context,
    now,
  );
  notifyListeners();
}
