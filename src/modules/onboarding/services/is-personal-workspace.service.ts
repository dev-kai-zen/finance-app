import { db, type DbContext } from "@/infrastructure/database/client";
import { getOnboardingSettings } from "../repositories/onboarding.repository";
import { ONBOARDING_SETTING_KEYS } from "../constants/onboarding.constants";

export function isPersonalWorkspace(context: DbContext = db): boolean {
  const settings = getOnboardingSettings(context);
  return settings[ONBOARDING_SETTING_KEYS.status] === "completed" && settings[ONBOARDING_SETTING_KEYS.workspaceMode] === "personal";
}

export function isSampleWorkspace(context: DbContext = db): boolean {
  const settings = getOnboardingSettings(context);
  return (
    settings[ONBOARDING_SETTING_KEYS.status] === "completed" &&
    settings[ONBOARDING_SETTING_KEYS.workspaceMode] === "sample"
  );
}

export function canImportWorkspaceData(
  context: DbContext = db,
  options?: { allowOnboarding?: boolean },
): boolean {
  if (isPersonalWorkspace(context)) return true;
  if (options?.allowOnboarding) return true;
  const settings = getOnboardingSettings(context);
  const status = settings[ONBOARDING_SETTING_KEYS.status];
  return !status || status === "pending";
}
