import type { WalkthroughStep } from "../types/walkthrough.types";

export const POCKET_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "pocketFormName",
    targetId: "pocketFormName",
    titleKey: "pocketFormWalkthrough.stepNameTitle",
    descKey: "pocketFormWalkthrough.stepNameDesc",
  },
  {
    id: "pocketFormDefaultExpense",
    targetId: "pocketFormDefaultExpense",
    titleKey: "pocketFormWalkthrough.stepDefaultExpenseTitle",
    descKey: "pocketFormWalkthrough.stepDefaultExpenseDesc",
  },
  {
    id: "pocketFormDefaultIncome",
    targetId: "pocketFormDefaultIncome",
    titleKey: "pocketFormWalkthrough.stepDefaultIncomeTitle",
    descKey: "pocketFormWalkthrough.stepDefaultIncomeDesc",
  },
  {
    id: "pocketFormSave",
    targetId: "pocketFormSave",
    titleKey: "pocketFormWalkthrough.stepSaveTitle",
    descKey: "pocketFormWalkthrough.stepSaveDesc",
  },
];

