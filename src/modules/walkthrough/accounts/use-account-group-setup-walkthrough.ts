import { useCallback, useEffect, useRef, useState } from "react";
import { useExperiencePreferences } from "@/modules/settings";
import { ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS } from "./account-group-setup-walkthrough-steps";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";

export function useAccountGroupSetupWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: string) => void;
} = {}) {
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const { measureTarget } = useWalkthroughRegistry();

  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeTargetLayout, setActiveTargetLayout] =
    useState<LayoutRect | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep: WalkthroughStep | undefined =
    ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS[activeStepIndex];

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (timer2Ref.current) clearTimeout(timer2Ref.current);
  }, []);

  const updateMeasurement = useCallback(
    (step: WalkthroughStep) => {
      clearTimers();

      onScrollToTarget?.(step.targetId);

      timerRef.current = setTimeout(async () => {
        const layout = await measureTarget(step.targetId);
        setActiveTargetLayout(layout);

        timer2Ref.current = setTimeout(async () => {
          const settledLayout = await measureTarget(step.targetId);
          if (settledLayout) {
            setActiveTargetLayout(settledLayout);
          }
        }, 350);
      }, 350);
    },
    [clearTimers, measureTarget, onScrollToTarget],
  );

  const startWalkthrough = useCallback(() => {
    setActiveStepIndex(0);
    setIsWalkthroughActive(true);
    if (ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS[0]) {
      updateMeasurement(ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS[0]);
    }
  }, [updateMeasurement]);

  const skipWalkthrough = useCallback(() => {
    clearTimers();
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("accountGroupSetupWalkthroughDismissed");
  }, [clearTimers, dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    clearTimers();
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("accountGroupSetupWalkthroughDismissed");
  }, [clearTimers, dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS.length - 1) {
      completeWalkthrough();
      return;
    }
    const nextIdx = activeStepIndex + 1;
    setActiveStepIndex(nextIdx);
    const nextStepObj = ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS[nextIdx];
    if (nextStepObj) {
      updateMeasurement(nextStepObj);
    }
  }, [activeStepIndex, completeWalkthrough, updateMeasurement]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    const prevIdx = activeStepIndex - 1;
    setActiveStepIndex(prevIdx);
    const prevStepObj = ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS[prevIdx];
    if (prevStepObj) {
      updateMeasurement(prevStepObj);
    }
  }, [activeStepIndex, updateMeasurement]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isWalkthroughActive,
    activeStepIndex,
    totalSteps: ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS.length,
    currentStep,
    activeTargetLayout,
    isCompleted: isPromptDismissed("accountGroupSetupWalkthroughDismissed"),
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
  };
}
