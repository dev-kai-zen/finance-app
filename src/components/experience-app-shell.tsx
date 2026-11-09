import type { PropsWithChildren, ReactNode } from "react";

import { NotificationModal } from "@/components/notification-modal";
import { AppShell } from "@/components/app-shell";
import { AppShellHeaderProvider } from "@/components/app-shell-header-context";
import { useExperiencePreferences } from "@/modules/settings";
import { useLocalization } from "@/infrastructure/localization";
import { GeneralSearchModal, SearchProvider } from "@/modules/search";
import { QuickEntryProvider } from "@/modules/gestures";

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
    <SearchProvider>
      <QuickEntryProvider>
        <AppShellHeaderProvider>
          <AppShell
            banner={banner}
            hiddenNavHrefs={hiddenNavHrefs}
            onSettingsTitlePress={
              experience.isDevModeAllowed
                ? experience.registerSettingsTitleTap
                : undefined
            }
          >
            {children}
          </AppShell>
        </AppShellHeaderProvider>
        <GeneralSearchModal />
      {experience.isDevModeAllowed && (
        <NotificationModal
          message={t("settings.developerModeEnabledMessage")}
          onClose={experience.dismissDeveloperUnlockNotice}
          title={t("settings.developerModeEnabledTitle")}
          variant="success"
          visible={experience.developerUnlockNotice}
        />
      )}
      </QuickEntryProvider>
    </SearchProvider>
  );
}
