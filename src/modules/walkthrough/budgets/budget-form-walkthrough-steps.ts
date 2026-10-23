import type { WalkthroughStep } from "../types/walkthrough.types";

export const BUDGET_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "budgetFormCategory",
    targetId: "budgetFormCategory",
    titleKey: "budgetFormWalkthrough.stepCategoryTitle",
    descKey: "budgetFormWalkthrough.stepCategoryDesc",
  },
  {
    id: "budgetFormEnable",
    targetId: "budgetFormEnable",
    titleKey: "budgetFormWalkthrough.stepEnableBudgetTitle",
    descKey: "budgetFormWalkthrough.stepEnableBudgetDesc",
  },
  {
    id: "budgetFormAmount",
    targetId: "budgetFormAmount",
    titleKey: "budgetFormWalkthrough.stepAmountTitle",
    descKey: "budgetFormWalkthrough.stepAmountDesc",
  },
  {
    id: "budgetFormFrequency",
    targetId: "budgetFormFrequency",
    titleKey: "budgetFormWalkthrough.stepFrequencyTitle",
    descKey: "budgetFormWalkthrough.stepFrequencyDesc",
  },
  {
    id: "budgetFormRollover",
    targetId: "budgetFormRollover",
    titleKey: "budgetFormWalkthrough.stepRolloverTitle",
    descKey: "budgetFormWalkthrough.stepRolloverDesc",
  },
  {
    id: "budgetFormAlert",
    targetId: "budgetFormAlert",
    titleKey: "budgetFormWalkthrough.stepOverBudgetAlertTitle",
    descKey: "budgetFormWalkthrough.stepOverBudgetAlertDesc",
  },
  {
    id: "budgetFormSave",
    targetId: "budgetFormSave",
    titleKey: "budgetFormWalkthrough.stepSaveTitle",
    descKey: "budgetFormWalkthrough.stepSaveDesc",
  },
];
