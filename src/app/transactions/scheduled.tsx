import { Stack } from "expo-router";

import { useAppTheme } from "@/hooks/use-app-theme";
import { ScheduledTransactionsScreen } from "@/modules/scheduled-transactions";

export default function ScheduledTransactionsRoute() {
  const theme = useAppTheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Scheduled Transactions",
          headerBackTitle: "Scheduled Transactions",
          headerBackButtonDisplayMode: "default",
          headerShadowVisible: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <ScheduledTransactionsScreen />
    </>
  );
}

