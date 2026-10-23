import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetNotesWalkthroughStepsOptions {
  hasAnyNotes?: boolean;
  hasNoteInList?: boolean;
}

export function getNotesWalkthroughSteps(
  options: GetNotesWalkthroughStepsOptions = {},
): WalkthroughStep[] {
  const { hasAnyNotes = false, hasNoteInList = false } = options;

  if (!hasAnyNotes) {
    return [
      {
        id: "notesEmptyCreateButton",
        targetId: "notesEmptyCreateButton",
        titleKey: "notesWalkthrough.stepEmptyCreateTitle",
        descKey: "notesWalkthrough.stepEmptyCreateDesc",
      },
    ];
  }

  const steps: WalkthroughStep[] = [
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
  ];

  if (hasNoteInList) {
    steps.push({
      id: "notesFirstItem",
      targetId: "notesFirstItem",
      titleKey: "notesWalkthrough.stepFirstItemTitle",
      descKey: "notesWalkthrough.stepFirstItemDesc",
    });
    steps.push({
      id: "notesFab",
      targetId: "notesFab",
      titleKey: "notesWalkthrough.stepFabTitle",
      descKey: "notesWalkthrough.stepFabDesc",
    });
  }

  return steps;
}
