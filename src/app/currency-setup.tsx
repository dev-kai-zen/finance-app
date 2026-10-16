import { useState } from "react";
import { Stack } from "expo-router";
import { ScreenTitleWithHelp, stackChevronBackOptions } from "@/components";
import { useLocalization } from "@/infrastructure/localization";
import { CurrencySetupScreen } from "@/modules/currencies";

export default function CurrencySetupRoute() {
  const { t } = useLocalization();
  const [helpVisible, setHelpVisible] = useState(false);

  return (
    <>
      <Stack.Screen
        options={{
          ...stackChevronBackOptions(t("common.goBack")),
          headerTitle: () => (
            <ScreenTitleWithHelp
              accessibilityHint={t("currency.helpTitle")}
              accessibilityLabel={t("currency.helpTitle")}
              onPressHelp={() => setHelpVisible(true)}
              title={t("navigation.currencySetup")}
            />
          ),
          headerTitleAlign: "left",
        }}
      />
      <CurrencySetupScreen
        helpVisible={helpVisible}
        onCloseHelp={() => setHelpVisible(false)}
      />
    </>
  );
}
