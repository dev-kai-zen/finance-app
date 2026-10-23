import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useExperiencePreferences } from "@/modules/settings";
import {
  getScheduleFormWalkthroughSteps,
  type ScheduleFormWalkthroughOptions,
} from "./schedule-form-walkthrough-steps";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";

export interface UseScheduleFormWalkthroughProps {
  options?: ScheduleFormWalkthroughOptions;
  onScrollToTarget?: (targetId: string) => void;
}

export function useScheduleFormWalkthrough({
  options,
  onScrollToTarget,
}: UseScheduleFormWalkthroughProps = {}) {
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const { measureTarget } = useWalkthroughRegistry();

  const steps = useMemo(
    () => getScheduleFormWalkthroughSteps(options),
    [options?.frequency, options?.isTransfer],
  );

  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeTargetLayout, setActiveTargetLayout] =
    useState<LayoutRect | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep: WalkthroughStep | undefined = steps[activeStepIndex];

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (timer2Ref.current) clearTimeout(timer2Ref.current);
  }, []);

  const updateMeasurement = useCallback(
    (step: WalkthroughStep) => {
      clearTimers();

      // 1. Auto-scroll to target
      onScrollToTarget?.(step.targetId);

      // 2. Initial measurement attempt
      timerRef.current = setTimeout(async () => {
        const layout = await measureTarget(step.targetId);
        setActiveTargetLayout(layout);

        // 3. Settle check
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
    if (steps[0]) {
      updateMeasurement(steps[0]);
    }
  }, [steps, updateMeasurement]);

  const skipWalkthrough = useCallback(() => {
    clearTimers();
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("scheduledTransactionFormWalkthroughDismissed");
  }, [clearTimers, dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    clearTimers();
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("scheduledTransactionFormWalkthroughDismissed");
  }, [clearTimers, dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= steps.length - 1) {
      completeWalkthrough();
      return;
    }
    const nextIdx = activeStepIndex + 1;
    setActiveStepIndex(nextIdx);
    const nextStepObj = steps[nextIdx];
    if (nextStepObj) {
      updateMeasurement(nextStepObj);
    }
  }, [activeStepIndex, completeWalkthrough, steps, updateMeasurement]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    const prevIdx = activeStepIndex - 1;
    setActiveStepIndex(prevIdx);
    const prevStepObj = steps[prevIdx];
    if (prevStepObj) {
      updateMeasurement(prevStepObj);
    }
  }, [activeStepIndex, steps, updateMeasurement]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isWalkthroughActive,
    activeStepIndex,
    totalSteps: steps.length,
    currentStep,
    activeTargetLayout,
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
    isPromptDismissed: isPromptDismissed(
      "scheduledTransactionFormWalkthroughDismissed",
    ),
  };
}
