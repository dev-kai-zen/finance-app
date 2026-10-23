import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExperiencePreferences } from "@/modules/settings";
import { CALENDAR_WALKTHROUGH_STEPS } from "./calendar-walkthrough-steps";
import type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughTargetId,
} from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";
import { isWalkthroughTargetVisible } from "../utils/walkthrough-viewport";

const CALENDAR_TAB_BY_TARGET: Partial<
  Record<
    WalkthroughTargetId,
    "transactions" | "schedules" | "net" | "balance_sheet"
  >
> = {
  calTransactionsTab: "transactions",
  calSchedulesTab: "schedules",
  calNetTab: "net",
  calBalanceSheetTab: "balance_sheet",
};

const CALENDAR_TAB_WALKTHROUGH_TARGETS = new Set<WalkthroughTargetId>([
  "calTransactionsTab",
  "calSchedulesTab",
  "calNetTab",
  "calBalanceSheetTab",
]);

/** Wait for activeTab content + horizontal tab bar to settle before measuring. */
const TAB_TARGET_SETTLE_MS = 400;

export interface UseCalendarWalkthroughOptions {
  onTabChange?: (
    tab: "transactions" | "schedules" | "net" | "balance_sheet",
  ) => void;
  onPrepareTabTarget?: (targetId: WalkthroughTargetId) => void;
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
}

export function useCalendarWalkthrough(
  options: UseCalendarWalkthroughOptions = {},
) {
  const { onTabChange, onPrepareTabTarget, onScrollToTarget } = options;
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const { measureTarget } = useWalkthroughRegistry();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeTargetLayout, setActiveTargetLayout] =
    useState<LayoutRect | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measurementGenerationRef = useRef(0);

  const currentStep: WalkthroughStep | undefined =
    CALENDAR_WALKTHROUGH_STEPS[activeStepIndex];

  const syncTabForTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      const tab = CALENDAR_TAB_BY_TARGET[targetId];
      if (!tab) {
        return;
      }
      onTabChange?.(tab);
      onPrepareTabTarget?.(targetId);
    },
    [onPrepareTabTarget, onTabChange],
  );

  const applyTargetLayout = useCallback(
    async (step: WalkthroughStep, generation: number) => {
      const layout = await measureTarget(step.targetId);
      if (generation !== measurementGenerationRef.current) {
        return;
      }
      setActiveTargetLayout(layout);
    },
    [measureTarget],
  );

  const updateMeasurement = useCallback(
    (step: WalkthroughStep) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const generation = ++measurementGenerationRef.current;
      setActiveTargetLayout(null);

      const isTabTarget = CALENDAR_TAB_WALKTHROUGH_TARGETS.has(step.targetId);

      const measureWithScrollIfNeeded = () => {
        void (async () => {
          const layout = await measureTarget(step.targetId);
          if (generation !== measurementGenerationRef.current) {
            return;
          }
          if (!layout) {
            return;
          }

          if (isWalkthroughTargetVisible(layout, windowHeight, insets)) {
            setActiveTargetLayout(layout);
            return;
          }

          onScrollToTarget?.(step.targetId);
          timerRef.current = setTimeout(() => {
            void applyTargetLayout(step, generation);
          }, 350);
        })();
      };

      if (isTabTarget) {
        syncTabForTarget(step.targetId);
        timerRef.current = setTimeout(measureWithScrollIfNeeded, TAB_TARGET_SETTLE_MS);
        return;
      }

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
          void applyTargetLayout(step, generation);
        }, 350);
      })();
    },
    [
      applyTargetLayout,
      insets,
      measureTarget,
      onScrollToTarget,
      syncTabForTarget,
      windowHeight,
    ],
  );

  const startWalkthrough = useCallback(() => {
    setActiveStepIndex(0);
    setIsWalkthroughActive(true);
  }, []);

  const skipWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("calendarWalkthroughDismissed");
  }, [dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("calendarWalkthroughDismissed");
  }, [dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= CALENDAR_WALKTHROUGH_STEPS.length - 1) {
      completeWalkthrough();
      return;
    }
    setActiveStepIndex(activeStepIndex + 1);
  }, [activeStepIndex, completeWalkthrough]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    setActiveStepIndex(activeStepIndex - 1);
  }, [activeStepIndex]);

  useEffect(() => {
    if (!isWalkthroughActive || !currentStep) {
      return;
    }
    updateMeasurement(currentStep);
  }, [currentStep, isWalkthroughActive, updateMeasurement]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    isWalkthroughActive,
    activeStepIndex,
    totalSteps: CALENDAR_WALKTHROUGH_STEPS.length,
    currentStep,
    activeTargetLayout,
    isCompleted: isPromptDismissed("calendarWalkthroughDismissed"),
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
  };
}
