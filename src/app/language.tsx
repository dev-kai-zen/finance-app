import { useState } from "react";
import { Stack } from "expo-router";
import { ScreenTitleWithHelp, stackChevronBackOptions } from "@/components";
import { useLocalization } from "@/infrastructure/localization";
import { LanguageScreen } from "@/modules/localization";

export default function LanguageRoute() {
  const { t } = useLocalization();
  const [helpVisible, setHelpVisible] = useState(false);

  return (
    <>
      <Stack.Screen
        options={{
          ...stackChevronBackOptions(t("common.goBack")),
          headerTitle: () => (
            <ScreenTitleWithHelp
              accessibilityHint={t("language.helpTitle")}
              accessibilityLabel={t("language.helpTitle")}
              onPressHelp={() => setHelpVisible(true)}
              title={t("navigation.language")}
            />
          ),
          headerTitleAlign: "left",
        }}
      />
      <LanguageScreen
        helpVisible={helpVisible}
        onCloseHelp={() => setHelpVisible(false)}
      />
    </>
  );
}
