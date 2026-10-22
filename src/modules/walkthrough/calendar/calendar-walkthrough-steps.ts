import type { WalkthroughStep } from "../types/walkthrough.types";

export const CALENDAR_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "calArrows",
    targetId: "calArrows",
    titleKey: "calendarWalkthrough.stepArrowsTitle",
    descKey: "calendarWalkthrough.stepArrowsDesc",
  },
  {
    id: "calTransactionsTab",
    targetId: "calTransactionsTab",
    titleKey: "calendarWalkthrough.stepTransactionsTitle",
    descKey: "calendarWalkthrough.stepTransactionsDesc",
  },
  {
    id: "calSchedulesTab",
    targetId: "calSchedulesTab",
    titleKey: "calendarWalkthrough.stepSchedulesTitle",
    descKey: "calendarWalkthrough.stepSchedulesDesc",
  },
  {
    id: "calNetTab",
    targetId: "calNetTab",
    titleKey: "calendarWalkthrough.stepNetTitle",
    descKey: "calendarWalkthrough.stepNetDesc",
  },
  {
    id: "calBalanceSheetTab",
    targetId: "calBalanceSheetTab",
    titleKey: "calendarWalkthrough.stepBalanceSheetTitle",
    descKey: "calendarWalkthrough.stepBalanceSheetDesc",
  },
];
