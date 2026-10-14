import { Stack } from "expo-router";
import { stackChevronBackOptions } from "@/components";
import { useLocalization } from "@/infrastructure/localization";
import { GoogleDriveBackupScreen } from "@/modules/google-drive-backup";

export default function GoogleDriveBackupRoute() {
  const { t } = useLocalization();

  return (
    <>
      <Stack.Screen
        options={{
          ...stackChevronBackOptions(t("common.goBack")),
          title: t("navigation.googleDriveBackup"),
        }}
      />
      <GoogleDriveBackupScreen />
    </>
  );
}
