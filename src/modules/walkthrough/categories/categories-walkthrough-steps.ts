import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetCategoriesWalkthroughStepsOptions {
  hasPresetsButton?: boolean;
  canReorderGroups?: boolean;
  canReorderSubcategories?: boolean;
  hasCategoryGroups?: boolean;
}

export function getCategoriesWalkthroughSteps(
  options: GetCategoriesWalkthroughStepsOptions = {},
): WalkthroughStep[] {
  const {
    hasPresetsButton = true,
    canReorderGroups = true,
    canReorderSubcategories = true,
    hasCategoryGroups = true,
  } = options;

  const steps: WalkthroughStep[] = [
    {
      id: "catTypeToggle",
      targetId: "catTypeToggle",
      titleKey: "categoriesWalkthrough.stepTypeToggleTitle",
      descKey: "categoriesWalkthrough.stepTypeToggleDesc",
    },
  ];

  if (canReorderGroups) {
    steps.push({
      id: "catReorderGroups",
      targetId: "catReorderGroups",
      titleKey: "categoriesWalkthrough.stepReorderGroupsTitle",
      descKey: "categoriesWalkthrough.stepReorderGroupsDesc",
    });
  }

  if (hasPresetsButton) {
    steps.push({
      id: "catPresetsIcon",
      targetId: "catPresetsIcon",
      titleKey: "categoriesWalkthrough.stepPresetsIconTitle",
      descKey: "categoriesWalkthrough.stepPresetsIconDesc",
    });
  }

  steps.push({
    id: "catNewCategory",
    targetId: "catNewCategory",
    titleKey: "categoriesWalkthrough.stepNewCategoryTitle",
    descKey: "categoriesWalkthrough.stepNewCategoryDesc",
  });

  if (hasCategoryGroups) {
    if (canReorderSubcategories) {
      steps.push({
        id: "catFirstGroupReorderSub",
        targetId: "catFirstGroupReorderSub",
        titleKey: "categoriesWalkthrough.stepReorderSubTitle",
        descKey: "categoriesWalkthrough.stepReorderSubDesc",
      });
    }

    steps.push({
      id: "catFirstGroupAddSub",
      targetId: "catFirstGroupAddSub",
      titleKey: "categoriesWalkthrough.stepAddSubTitle",
      descKey: "categoriesWalkthrough.stepAddSubDesc",
    });
  }

  return steps;
}
