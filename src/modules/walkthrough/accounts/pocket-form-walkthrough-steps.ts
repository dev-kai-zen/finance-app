import type { WalkthroughStep } from "../types/walkthrough.types";

export interface PocketFormWalkthroughOptions {
  isEditing?: boolean;
}

export function getPocketFormWalkthroughSteps(
  options: PocketFormWalkthroughOptions = {},
): WalkthroughStep[] {
  const { isEditing = false } = options;

  const steps: WalkthroughStep[] = [
    {
      id: "pocketFormName",
      targetId: "pocketFormName",
      titleKey: "pocketFormWalkthrough.stepNameTitle",
      descKey: "pocketFormWalkthrough.stepNameDesc",
    },
  ];

  if (isEditing) {
    steps.push(
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
    );
  }

  steps.push({
    id: "pocketFormSave",
    targetId: "pocketFormSave",
    titleKey: "pocketFormWalkthrough.stepSaveTitle",
    descKey: "pocketFormWalkthrough.stepSaveDesc",
  });

  return steps;
}

export const POCKET_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] =
  getPocketFormWalkthroughSteps({ isEditing: true });


