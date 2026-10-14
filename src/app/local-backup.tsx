import { Stack } from "expo-router";
import { stackChevronBackOptions } from "@/components";
import { useLocalization } from "@/infrastructure/localization";
import { LocalBackupScreen } from "@/modules/local-backup";

export default function LocalBackupRoute() {
  const { t } = useLocalization();

  return (
    <>
      <Stack.Screen
        options={{
          ...stackChevronBackOptions(t("common.goBack")),
          title: t("navigation.localBackup"),
        }}
      />
      <LocalBackupScreen />
    </>
  );
}
