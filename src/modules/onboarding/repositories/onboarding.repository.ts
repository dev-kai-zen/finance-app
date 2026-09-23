import { inArray } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import { ONBOARDING_SETTING_KEYS } from "@/modules/onboarding/constants/onboarding.constants";

type OnboardingSettingKey =
  (typeof ONBOARDING_SETTING_KEYS)[keyof typeof ONBOARDING_SETTING_KEYS];

export function getOnboardingSettings(
  context: DbContext = db,
): Partial<Record<OnboardingSettingKey, string>> {
  const keys = Object.values(ONBOARDING_SETTING_KEYS);
  const rows = context
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys))
    .all();

  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

export function saveOnboardingSettings(
  values: Partial<Record<OnboardingSettingKey, string>>,
  context: DbContext = db,
  now = new Date(),
): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    context
      .insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: now },
      })
      .run();
  }
}
