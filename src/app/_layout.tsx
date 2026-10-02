import { LogBox, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppShell } from "@/components/app-shell";
import { AppThemeProvider, useThemeContext } from "@/components/theme";
import { DatabaseProvider } from "@/infrastructure/database";
import { HexColorsProvider } from "@/modules/hex-colors";
import {
  OnboardingGate,
  SampleWorkspaceBanner,
  WorkspaceProvider,
} from "@/modules/onboarding";
import { ScheduledTransactionsProcessor } from "@/modules/scheduled-transactions";
import { TransactionAttachmentsSyncProcessor } from "@/modules/transactions";

LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

function RootLayoutContent() {
  const { theme } = useThemeContext();

  return (
    <SafeAreaProvider
      style={[styles.rootLayer, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <KeyboardProvider>
        <DatabaseProvider>
          <WorkspaceProvider>
            <HexColorsProvider>
              <SafeAreaView
                edges={["top"]}
                style={[
                  styles.safeAreaBoundary,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                <OnboardingGate>
                  <>
                    <ScheduledTransactionsProcessor />
                    <TransactionAttachmentsSyncProcessor />
                    <AppShell banner={<SampleWorkspaceBanner />}>
                      <Stack
                        screenOptions={{
                          contentStyle: {
                            backgroundColor: theme.colors.background,
                          },
                          headerShown: false,
                        }}
                      >
                        <Stack.Screen name="index" />
                        <Stack.Screen name="accounts" />
                        <Stack.Screen name="transactions" />
                        <Stack.Screen name="credit-cards" />
                        <Stack.Screen name="categories" />
                        <Stack.Screen name="settings" />
                        <Stack.Screen name="monitor" />
                      </Stack>
                    </AppShell>
                  </>
                </OnboardingGate>
              </SafeAreaView>
            </HexColorsProvider>
          </WorkspaceProvider>
        </DatabaseProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.rootLayer}>
      <AppThemeProvider>
        <RootLayoutContent />
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootLayer: {
    flex: 1,
  },
  safeAreaBoundary: {
    flex: 1,
  },
});
