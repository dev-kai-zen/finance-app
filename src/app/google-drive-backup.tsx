import { useState } from "react";
import { Stack } from "expo-router";
import { ScreenTitleWithHelp, stackChevronBackOptions } from "@/components";
import { useLocalization } from "@/infrastructure/localization";
import { GoogleDriveBackupScreen } from "@/modules/google-drive-backup";

export default function GoogleDriveBackupRoute() {
  const { t } = useLocalization();
  const [helpVisible, setHelpVisible] = useState(false);

  return (
    <>
      <Stack.Screen
        options={{
          ...stackChevronBackOptions(t("common.goBack")),
          headerTitle: () => (
            <ScreenTitleWithHelp
              accessibilityHint={t("googleDriveBackup.helpTitle")}
              accessibilityLabel={t("googleDriveBackup.helpTitle")}
              onPressHelp={() => setHelpVisible(true)}
              title={t("navigation.googleDriveBackup")}
            />
          ),
          headerTitleAlign: "left",
        }}
      />
      <GoogleDriveBackupScreen
        helpVisible={helpVisible}
        onCloseHelp={() => setHelpVisible(false)}
      />
    </>
  );
}
