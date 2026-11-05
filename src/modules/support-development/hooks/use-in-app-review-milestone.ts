import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useExperiencePreferences } from "@/modules/settings";
import { getTransactionCount } from "@/modules/transactions";

import { MIN_TRANSACTIONS_FOR_REVIEW_PROMPT } from "../constants/support-development.constants";
import { requestInAppReview } from "../services/request-in-app-review.service";

interface UseInAppReviewMilestoneOptions {
  enabled?: boolean;
}

export function useInAppReviewMilestone({
  enabled = true,
}: UseInAppReviewMilestoneOptions = {}) {
  const experience = useExperiencePreferences();
  const [visible, setVisible] = useState(false);
  const isPostponedInSession = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      if (isPostponedInSession.current) return;
      if (experience.isPromptDismissed("inAppReview10MilestoneDismissed")) return;

      try {
        const count = getTransactionCount();
        if (count >= MIN_TRANSACTIONS_FOR_REVIEW_PROMPT) {
          const timer = setTimeout(() => {
            setVisible(true);
          }, 800);
          return () => clearTimeout(timer);
        }
      } catch {
        // Ignore during initial SQLite migration or load
      }
    }, [enabled, experience]),
  );

  const handleRateNow = useCallback(async () => {
    setVisible(false);
    experience.dismissPrompt("inAppReview10MilestoneDismissed");
    await requestInAppReview();
  }, [experience]);

  const handleMaybeLater = useCallback(() => {
    setVisible(false);
    isPostponedInSession.current = true;
  }, []);

  const handleNeverAskAgain = useCallback(() => {
    setVisible(false);
    experience.dismissPrompt("inAppReview10MilestoneDismissed");
  }, [experience]);

  return {
    isReviewModalVisible: visible,
    handleRateNow,
    handleMaybeLater,
    handleNeverAskAgain,
  };
}
