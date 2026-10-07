import { Stack } from "expo-router";
import { useLocalization } from "@/infrastructure/localization";
import { LanguageScreen } from "@/modules/localization";

export default function LanguageRoute() {
  const { t } = useLocalization();

  return (
    <>
      <Stack.Screen
        options={{
          headerBackTitle: t("navigation.language"),
          title: t("navigation.language"),
        }}
      />
      <LanguageScreen />
    </>
  );
}
