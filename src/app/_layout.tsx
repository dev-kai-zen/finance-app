import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "@/components/app-shell";
import { AppThemeProvider } from "@/components/theme";
import { DatabaseProvider } from "@/infrastructure/database";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <DatabaseProvider>
          <AppShell>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="accounts" />
              <Stack.Screen name="transactions" />
              <Stack.Screen name="categories" />
              <Stack.Screen name="settings" />
            </Stack>
          </AppShell>
        </DatabaseProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}