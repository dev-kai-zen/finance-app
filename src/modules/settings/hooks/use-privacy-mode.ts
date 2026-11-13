import { useCallback, useEffect, useState } from "react";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
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
    setIsPrivate((prev) => {
      const next = !prev;
      scheduleAfterPaint(() => {
        setPrivacyModeSetting(next);
      });
      return next;
    });
  }, []);

  const setPrivacyMode = useCallback((val: boolean) => {
    setIsPrivate(val);
    scheduleAfterPaint(() => {
      setPrivacyModeSetting(val);
    });
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

