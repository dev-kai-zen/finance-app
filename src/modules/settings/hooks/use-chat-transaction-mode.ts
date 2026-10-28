import { useCallback, useEffect, useState } from "react";
import {
  getChatTransactionMode,
  setChatTransactionMode,
  subscribeToChatTransactionMode,
  type ChatTransactionMode,
} from "../services/chat-transaction-mode.service";

export function useChatTransactionMode(): {
  mode: ChatTransactionMode;
  setMode: (mode: ChatTransactionMode) => void;
} {
  const [mode, setModeState] = useState<ChatTransactionMode>(() =>
    getChatTransactionMode(),
  );

  const refresh = useCallback(() => {
    setModeState(getChatTransactionMode());
  }, []);

  useEffect(() => {
    return subscribeToChatTransactionMode(refresh);
  }, [refresh]);

  const updateMode = useCallback((newMode: ChatTransactionMode) => {
    setChatTransactionMode(newMode);
    setModeState(newMode);
  }, []);

  return {
    mode,
    setMode: updateMode,
  };
}
