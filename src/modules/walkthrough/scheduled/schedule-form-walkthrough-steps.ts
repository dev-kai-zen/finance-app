import type { WalkthroughStep } from "../types/walkthrough.types";

export interface ScheduleFormWalkthroughOptions {
  frequency?: "once" | "daily" | "weekly" | "monthly" | "yearly";
  isTransfer?: boolean;
}

export function getScheduleFormWalkthroughSteps(
  options: ScheduleFormWalkthroughOptions = {},
): WalkthroughStep[] {
  const { frequency = "monthly", isTransfer = false } = options;

  const steps: WalkthroughStep[] = [
    {
      id: "scheduleFormType",
      targetId: "scheduleFormType",
      titleKey: "scheduleFormWalkthrough.stepTypeTitle",
      descKey: "scheduleFormWalkthrough.stepTypeDesc",
    },
    {
      id: "scheduleFormName",
      targetId: "scheduleFormName",
      titleKey: "scheduleFormWalkthrough.stepNameTitle",
      descKey: "scheduleFormWalkthrough.stepNameDesc",
    },
    {
      id: "scheduleFormAmount",
      targetId: "scheduleFormAmount",
      titleKey: "scheduleFormWalkthrough.stepAmountTitle",
      descKey: "scheduleFormWalkthrough.stepAmountDesc",
    },
    {
      id: "scheduleFormAccount",
      targetId: "scheduleFormAccount",
      titleKey: "scheduleFormWalkthrough.stepAccountTitle",
      descKey: "scheduleFormWalkthrough.stepAccountDesc",
    },
    {
      id: "scheduleFormCategory",
      targetId: "scheduleFormCategory",
      titleKey: "scheduleFormWalkthrough.stepCategoryTitle",
      descKey: "scheduleFormWalkthrough.stepCategoryDesc",
    },
    {
      id: "scheduleFormNote",
      targetId: "scheduleFormNote",
      titleKey: "scheduleFormWalkthrough.stepNoteTitle",
      descKey: "scheduleFormWalkthrough.stepNoteDesc",
    },
    {
      id: "scheduleFormRecurrence",
      targetId: "scheduleFormRecurrence",
      titleKey: "scheduleFormWalkthrough.stepRecurrenceTitle",
      descKey: "scheduleFormWalkthrough.stepRecurrenceDesc",
    },
    {
      id: "scheduleFormStartDate",
      targetId: "scheduleFormStartDate",
      titleKey: "scheduleFormWalkthrough.stepStartingOnTitle",
      descKey: "scheduleFormWalkthrough.stepStartingOnDesc",
    },
    {
      id: "scheduleFormFrequency",
      targetId: "scheduleFormFrequency",
      titleKey: "scheduleFormWalkthrough.stepFrequencyTitle",
      descKey: "scheduleFormWalkthrough.stepFrequencyDesc",
    },
  ];

  if (frequency !== "once") {
    steps.push(
      {
        id: "scheduleFormRepeat",
        targetId: "scheduleFormRepeat",
        titleKey: "scheduleFormWalkthrough.stepRepeatTitle",
        descKey: "scheduleFormWalkthrough.stepRepeatDesc",
      },
      {
        id: "scheduleFormEnds",
        targetId: "scheduleFormEnds",
        titleKey: "scheduleFormWalkthrough.stepEndsTitle",
        descKey: "scheduleFormWalkthrough.stepEndsDesc",
      },
      {
        id: "scheduleFormWeekend",
        targetId: "scheduleFormWeekend",
        titleKey: "scheduleFormWalkthrough.stepWeekendTitle",
        descKey: "scheduleFormWalkthrough.stepWeekendDesc",
      },
    );
  }

  steps.push(
    {
      id: "scheduleFormAutoEnter",
      targetId: "scheduleFormAutoEnter",
      titleKey: "scheduleFormWalkthrough.stepAutoEnterTitle",
      descKey: "scheduleFormWalkthrough.stepAutoEnterDesc",
    },
    {
      id: "scheduleFormSave",
      targetId: "scheduleFormSave",
      titleKey: "scheduleFormWalkthrough.stepSaveTitle",
      descKey: "scheduleFormWalkthrough.stepSaveDesc",
    },
  );

  return steps;
}

export const SCHEDULE_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] =
  getScheduleFormWalkthroughSteps();
