export { InAppUpdateProcessor } from "./components/in-app-update-processor";
export { InAppUpdateBanner } from "./components/in-app-update-banner";
export { useInAppUpdate } from "./hooks/use-in-app-update";
export {
  checkAppUpdate,
  startAppUpdate,
  checkAndPromptUpdate,
  completeFlexibleUpdate,
} from "./services/in-app-update.service";
export type {
  AppUpdateCheckResult,
  AppUpdateDownloadProgress,
  AppUpdateStatus,
} from "./types/app-updates.types";

