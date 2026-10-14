import type { PropsWithChildren, ReactNode } from "react";

import { NotificationModal } from "@/components/notification-modal";
import { AppShell } from "@/components/app-shell";
import { useExperiencePreferences } from "@/modules/settings";
import { useLocalization } from "@/infrastructure/localization";

export function ExperienceAppShell({
  banner,
  children,
}: PropsWithChildren<{ banner?: ReactNode }>) {
  const { t } = useLocalization();
  const experience = useExperiencePreferences();

  const hiddenNavHrefs = [...experience.hiddenNavHrefs];
  if (!experience.developerMode) {
    hiddenNavHrefs.push("/monitor");
  }

  return (
    <>
      <AppShell
        banner={banner}
        hiddenNavHrefs={hiddenNavHrefs}
        onSettingsTitlePress={experience.registerSettingsTitleTap}
      >
        {children}
      </AppShell>
      <NotificationModal
        message={t("settings.developerModeEnabledMessage")}
        onClose={experience.dismissDeveloperUnlockNotice}
        title={t("settings.developerModeEnabledTitle")}
        variant="success"
        visible={experience.developerUnlockNotice}
      />
    </>
  );
}
