import { useCallback, useEffect, useRef, useState } from "react";
import { useExperiencePreferences } from "@/modules/settings";
import { ACCOUNTS_WALKTHROUGH_STEPS } from "./accounts-walkthrough-steps";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";

export function useAccountsWalkthrough({
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

  const currentStep: WalkthroughStep | undefined =
    ACCOUNTS_WALKTHROUGH_STEPS[activeStepIndex];

  const updateMeasurement = useCallback(
    (step: WalkthroughStep) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (step.isSimulatedModal) {
        setActiveTargetLayout(null);
        return;
      }

      // 1. Trigger auto-scroll first so element is visible in viewport
      onScrollToTarget?.(step.targetId);

      // 2. Wait 350ms for native animated scroll to settle before measuring coordinates
      timerRef.current = setTimeout(async () => {
        const layout = await measureTarget(step.targetId);
        setActiveTargetLayout(layout);
      }, 350);
    },
    [measureTarget, onScrollToTarget],
  );

  const startWalkthrough = useCallback(() => {
    setActiveStepIndex(0);
    setIsWalkthroughActive(true);
    if (ACCOUNTS_WALKTHROUGH_STEPS[0]) {
      updateMeasurement(ACCOUNTS_WALKTHROUGH_STEPS[0]);
    }
  }, [updateMeasurement]);

  const skipWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("accountsWalkthroughDismissed");
  }, [dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("accountsWalkthroughDismissed");
  }, [dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= ACCOUNTS_WALKTHROUGH_STEPS.length - 1) {
      completeWalkthrough();
      return;
    }
    const nextIdx = activeStepIndex + 1;
    setActiveStepIndex(nextIdx);
    const nextStepObj = ACCOUNTS_WALKTHROUGH_STEPS[nextIdx];
    if (nextStepObj) {
      updateMeasurement(nextStepObj);
    }
  }, [activeStepIndex, completeWalkthrough, updateMeasurement]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    const prevIdx = activeStepIndex - 1;
    setActiveStepIndex(prevIdx);
    const prevStepObj = ACCOUNTS_WALKTHROUGH_STEPS[prevIdx];
    if (prevStepObj) {
      updateMeasurement(prevStepObj);
    }
  }, [activeStepIndex, updateMeasurement]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    isWalkthroughActive,
    activeStepIndex,
    totalSteps: ACCOUNTS_WALKTHROUGH_STEPS.length,
    currentStep,
    activeTargetLayout,
    isCompleted: isPromptDismissed("accountsWalkthroughDismissed"),
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
  };
}
