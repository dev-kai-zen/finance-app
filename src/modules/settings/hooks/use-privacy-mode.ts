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

  const togglePrivacyMode = useCallback((onComplete?: () => void) => {
    setIsPrivate((prev) => {
      const next = !prev;
      scheduleAfterPaint(() => {
        setPrivacyModeSetting(next);
        requestAnimationFrame(() => {
          onComplete?.();
        });
      });
      return next;
    });
  }, []);

  const setPrivacyMode = useCallback((val: boolean, onComplete?: () => void) => {
    setIsPrivate(val);
    scheduleAfterPaint(() => {
      setPrivacyModeSetting(val);
      requestAnimationFrame(() => {
        onComplete?.();
      });
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

