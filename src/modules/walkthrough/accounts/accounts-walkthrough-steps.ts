import type { WalkthroughStep } from "../types/walkthrough.types";

export const ACCOUNTS_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "archivedChip",
    targetId: "archivedChip",
    titleKey: "accountsWalkthrough.stepArchivedTitle",
    descKey: "accountsWalkthrough.stepArchivedDesc",
  },
  {
    id: "fundGroupsChip",
    targetId: "fundGroupsChip",
    titleKey: "accountsWalkthrough.stepFundGroupsTitle",
    descKey: "accountsWalkthrough.stepFundGroupsDesc",
  },
  {
    id: "searchBox",
    targetId: "searchBox",
    titleKey: "accountsWalkthrough.stepSearchTitle",
    descKey: "accountsWalkthrough.stepSearchDesc",
  },
  {
    id: "assetsSection",
    targetId: "assetsSection",
    titleKey: "accountsWalkthrough.stepAssetsTitle",
    descKey: "accountsWalkthrough.stepAssetsDesc",
  },
  {
    id: "liabilitiesSection",
    targetId: "liabilitiesSection",
    titleKey: "accountsWalkthrough.stepLiabilitiesTitle",
    descKey: "accountsWalkthrough.stepLiabilitiesDesc",
  },
  {
    id: "accountsFab",
    targetId: "accountsFab",
    titleKey: "accountsWalkthrough.stepFabTitle",
    descKey: "accountsWalkthrough.stepFabDesc",
  },
  {
    id: "accountsSheetDemonstration",
    targetId: "accountsSheetDemonstration",
    titleKey: "accountsWalkthrough.stepSheetTitle",
    descKey: "accountsWalkthrough.stepSheetDesc",
    isSimulatedModal: true,
  },
];
