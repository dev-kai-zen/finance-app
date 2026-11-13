import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExperiencePreferences } from "@/modules/settings";
import type { ReportTabKey } from "@/modules/reports/types/reports.types";
import { getReportsWalkthroughSteps } from "./reports-walkthrough-steps";
import type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughTargetId,
} from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";
import { isWalkthroughTargetVisible } from "../utils/walkthrough-viewport";

export interface UseReportsWalkthroughOptions {
  onTabChange?: (tab: ReportTabKey) => void;
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
}

export function useReportsWalkthrough(
  options: UseReportsWalkthroughOptions = {},
) {
  const { onTabChange, onScrollToTarget } = options;
  const { dismissPrompt } = useExperiencePreferences();
  const { measureTarget } = useWalkthroughRegistry();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const steps = useMemo(() => getReportsWalkthroughSteps(), []);

  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeTargetLayout, setActiveTargetLayout] =
    useState<LayoutRect | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measurementGenerationRef = useRef(0);

  const currentStep: WalkthroughStep | undefined = steps[activeStepIndex];

  const updateMeasurement = useCallback(
    (step: WalkthroughStep) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const generation = ++measurementGenerationRef.current;

      const applyLayout = async () => {
        const layout = await measureTarget(step.targetId);
        if (generation !== measurementGenerationRef.current) {
          return;
        }
        setActiveTargetLayout(layout);
      };

      void (async () => {
        const initialLayout = await measureTarget(step.targetId);
        if (generation !== measurementGenerationRef.current) {
          return;
        }
        if (
          initialLayout &&
          isWalkthroughTargetVisible(initialLayout, windowHeight, insets)
        ) {
          setActiveTargetLayout(initialLayout);
          return;
        }

        onScrollToTarget?.(step.targetId);

        timerRef.current = setTimeout(() => {
          void applyLayout();
        }, 350);
      })();
    },
    [insets, measureTarget, onScrollToTarget, windowHeight],
  );

  const startWalkthrough = useCallback(() => {
    onTabChange?.("income-expense");
    setActiveStepIndex(0);
    setIsWalkthroughActive(true);
  }, [onTabChange]);

  const skipWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("reportsWalkthroughDismissed");
  }, [dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= steps.length - 1) {
      skipWalkthrough();
      return;
    }
    setActiveStepIndex((prev) => prev + 1);
  }, [activeStepIndex, skipWalkthrough, steps.length]);

  const prevStep = useCallback(() => {
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
    }
  }, [activeStepIndex]);

  useEffect(() => {
    if (!isWalkthroughActive || !currentStep) {
      return;
    }
    updateMeasurement(currentStep);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isWalkthroughActive, currentStep, updateMeasurement]);

  return {
    isWalkthroughActive,
    activeStepIndex,
    totalSteps: steps.length,
    currentStep,
    activeTargetLayout,
    startWalkthrough,
    skipWalkthrough,
    nextStep,
    prevStep,
  };
}

