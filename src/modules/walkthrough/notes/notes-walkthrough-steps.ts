import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetNotesWalkthroughStepsOptions {
  hasNotes: boolean;
}

export function getNotesWalkthroughSteps(
  options: GetNotesWalkthroughStepsOptions,
): WalkthroughStep[] {
  const { hasNotes } = options;

  if (!hasNotes) {
    return [
      {
        id: "notesEmptyCreateButton",
        targetId: "notesEmptyCreateButton",
        titleKey: "notesWalkthrough.stepEmptyCreateTitle",
        descKey: "notesWalkthrough.stepEmptyCreateDesc",
      },
    ];
  }

  return [
    {
      id: "notesSearch",
      targetId: "notesSearch",
      titleKey: "notesWalkthrough.stepSearchTitle",
      descKey: "notesWalkthrough.stepSearchDesc",
    },
    {
      id: "notesViewMode",
      targetId: "notesViewMode",
      titleKey: "notesWalkthrough.stepViewModeTitle",
      descKey: "notesWalkthrough.stepViewModeDesc",
    },
    {
      id: "notesSortFilter",
      targetId: "notesSortFilter",
      titleKey: "notesWalkthrough.stepSortFilterTitle",
      descKey: "notesWalkthrough.stepSortFilterDesc",
    },
    {
      id: "notesFirstItem",
      targetId: "notesFirstItem",
      titleKey: "notesWalkthrough.stepFirstItemTitle",
      descKey: "notesWalkthrough.stepFirstItemDesc",
    },
    {
      id: "notesFab",
      targetId: "notesFab",
      titleKey: "notesWalkthrough.stepFabTitle",
      descKey: "notesWalkthrough.stepFabDesc",
    },
  ];
}
