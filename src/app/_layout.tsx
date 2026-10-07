import { LogBox, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppShell } from "@/components/app-shell";
import { AppThemeProvider, useThemeContext } from "@/components/theme";
import { DatabaseProvider } from "@/infrastructure/database";
import { LocalizationProvider } from "@/infrastructure/localization";
import { HexColorsProvider } from "@/modules/hex-colors";
import { LocalBackupProcessor } from "@/modules/local-backup";
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
  const pathname = usePathname();
  const usesNativeHeader =
    pathname.startsWith("/language") ||
    pathname.startsWith("/local-backup") ||
    pathname.startsWith("/google-drive-backup") ||
    pathname.startsWith("/transactions/scheduled");

  return (
    <SafeAreaProvider
      style={[styles.rootLayer, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <KeyboardProvider>
        <DatabaseProvider>
          <LocalizationProvider>
            <WorkspaceProvider>
              <HexColorsProvider>
                <SafeAreaView
                  edges={usesNativeHeader ? [] : ["top"]}
                  style={[
                    styles.safeAreaBoundary,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                <OnboardingGate>
                  <>
                    <ScheduledTransactionsProcessor />
                    <TransactionAttachmentsSyncProcessor />
                    <LocalBackupProcessor />
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
                        <Stack.Screen name="calendar" />
                        <Stack.Screen name="credit-cards" />
                        <Stack.Screen name="categories" />
                        <Stack.Screen name="budgets" />
                        <Stack.Screen name="goals" />
                        <Stack.Screen name="reports" />
                        <Stack.Screen name="notes" />
                        <Stack.Screen name="settings" />
                        <Stack.Screen
                          name="language"
                          options={{
                            presentation: "fullScreenModal",
                            headerShown: true,
                            title: "Language",
                            headerBackTitle: "Language",
                            headerBackButtonDisplayMode: "default",
                            headerShadowVisible: true,
                            headerStyle: {
                              backgroundColor: theme.colors.background,
                            },
                            headerTintColor: theme.colors.textPrimary,
                          }}
                        />
                        <Stack.Screen
                          name="local-backup"
                          options={{
                            presentation: "fullScreenModal",
                            headerShown: true,
                            title: "Local Backup",
                            headerBackTitle: "Local Backup",
                            headerBackButtonDisplayMode: "default",
                            headerShadowVisible: true,
                            headerStyle: {
                              backgroundColor: theme.colors.background,
                            },
                            headerTintColor: theme.colors.textPrimary,
                          }}
                        />
                        <Stack.Screen
                          name="google-drive-backup"
                          options={{
                            presentation: "fullScreenModal",
                            headerShown: true,
                            title: "Google Drive Backup",
                            headerBackTitle: "Google Drive Backup",
                            headerBackButtonDisplayMode: "default",
                            headerShadowVisible: true,
                            headerStyle: {
                              backgroundColor: theme.colors.background,
                            },
                            headerTintColor: theme.colors.textPrimary,
                          }}
                        />
                        <Stack.Screen name="monitor" />
                      </Stack>
                    </AppShell>
                  </>
                </OnboardingGate>
                </SafeAreaView>
              </HexColorsProvider>
            </WorkspaceProvider>
          </LocalizationProvider>
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
