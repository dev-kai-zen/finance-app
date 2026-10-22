export {
  WalkthroughRegistryProvider,
  WalkthroughTarget,
  useWalkthroughRegistry,
  useWalkthroughTarget,
} from "./components/walkthrough-target";
export { DraggableTourChip } from "./components/draggable-tour-chip";

export { DashboardWalkthroughOverlay } from "./dashboard/dashboard-walkthrough-overlay";
export { DashboardCongratulationsModal } from "./dashboard/dashboard-congratulations-modal";
export { useDashboardWalkthrough } from "./dashboard/use-dashboard-walkthrough";
export { DASHBOARD_WALKTHROUGH_STEPS } from "./dashboard/dashboard-walkthrough-steps";

export type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughStepId,
  WalkthroughTargetId,
} from "./types/walkthrough.types";
