import { useCallback, useEffect, useState } from "react";
import {
  formatPrivacyAmount,
  getPrivacyModeSetting,
  setPrivacyModeSetting,
  subscribeToPrivacyModeSetting,
} from "../services/privacy-mode.service";

export function usePrivacyMode() {
  const [isPrivate, setIsPrivate] = useState<boolean>(() =>
    getPrivacyModeSetting(),
  );

  useEffect(() => {
    return subscribeToPrivacyModeSetting((nextValue) => {
      setIsPrivate(nextValue);
    });
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyModeSetting(!getPrivacyModeSetting());
  }, []);

  const setPrivacyMode = useCallback((val: boolean) => {
    setPrivacyModeSetting(val);
  }, []);

  const formatPrivacy = useCallback(
    (amount: string) => {
      return formatPrivacyAmount(amount, isPrivate);
    },
    [isPrivate],
  );

  return {
    isPrivate,
    togglePrivacyMode,
    setPrivacyMode,
    formatPrivacy,
  };
}

