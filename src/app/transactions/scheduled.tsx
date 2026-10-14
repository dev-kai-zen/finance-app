import { Stack } from "expo-router";

import { stackChevronBackOptions } from "@/components";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ScheduledTransactionsScreen } from "@/modules/scheduled-transactions";

export default function ScheduledTransactionsRoute() {
  const theme = useAppTheme();
  const { t } = useLocalization();

  return (
    <>
      <Stack.Screen
        options={{
          ...stackChevronBackOptions(t("common.goBack")),
          headerShown: true,
          headerShadowVisible: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.textPrimary,
          title: t("navigation.scheduledTransactions"),
        }}
      />
      <ScheduledTransactionsScreen />
    </>
  );
}
