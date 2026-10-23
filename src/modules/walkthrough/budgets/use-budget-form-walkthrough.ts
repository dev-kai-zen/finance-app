import { useCallback, useEffect, useRef, useState } from "react";
import { useExperiencePreferences } from "@/modules/settings";
import { BUDGET_FORM_WALKTHROUGH_STEPS } from "./budget-form-walkthrough-steps";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";

export function useBudgetFormWalkthrough({
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
    BUDGET_FORM_WALKTHROUGH_STEPS[activeStepIndex];

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
    if (BUDGET_FORM_WALKTHROUGH_STEPS[0]) {
      updateMeasurement(BUDGET_FORM_WALKTHROUGH_STEPS[0]);
    }
  }, [updateMeasurement]);

  const skipWalkthrough = useCallback(() => {
    clearTimers();
    setIsWalkthroughActive(false);
    dismissPrompt("budgetFormWalkthroughDismissed");
  }, [clearTimers, dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    clearTimers();
    setIsWalkthroughActive(false);
    dismissPrompt("budgetFormWalkthroughDismissed");
  }, [clearTimers, dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= BUDGET_FORM_WALKTHROUGH_STEPS.length - 1) {
      completeWalkthrough();
      return;
    }
    const nextIdx = activeStepIndex + 1;
    setActiveStepIndex(nextIdx);
    const nextStepObj = BUDGET_FORM_WALKTHROUGH_STEPS[nextIdx];
    if (nextStepObj) {
      updateMeasurement(nextStepObj);
    }
  }, [activeStepIndex, completeWalkthrough, updateMeasurement]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    const prevIdx = activeStepIndex - 1;
    setActiveStepIndex(prevIdx);
    const prevStepObj = BUDGET_FORM_WALKTHROUGH_STEPS[prevIdx];
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
    totalSteps: BUDGET_FORM_WALKTHROUGH_STEPS.length,
    currentStep,
    activeTargetLayout,
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
    isPromptDismissed: isPromptDismissed("budgetFormWalkthroughDismissed"),
  };
}
