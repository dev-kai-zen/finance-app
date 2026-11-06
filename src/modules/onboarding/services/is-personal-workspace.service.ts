import { db, type DbContext } from "@/infrastructure/database/client";
import { getOnboardingSettings } from "../repositories/onboarding.repository";
import { ONBOARDING_SETTING_KEYS } from "../constants/onboarding.constants";

export function isPersonalWorkspace(context: DbContext = db): boolean {
  const settings = getOnboardingSettings(context);
  return settings[ONBOARDING_SETTING_KEYS.status] === "completed" && settings[ONBOARDING_SETTING_KEYS.workspaceMode] === "personal";
}
