import { LogBox, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ExperienceAppShell } from "@/components/experience-app-shell";
import { AppThemeProvider, useThemeContext } from "@/components/theme";
import { DatabaseProvider } from "@/infrastructure/database";
import { LocalizationProvider } from "@/infrastructure/localization";
import { CurrencyPreferencesProvider } from "@/modules/currencies";
import { HexColorsProvider } from "@/modules/hex-colors";
import { LocalBackupProcessor } from "@/modules/local-backup";
import {
  OnboardingGate,
  SampleWorkspaceBanner,
  WorkspaceProvider,
} from "@/modules/onboarding";
import { NotificationsReminderProcessor } from "@/modules/notifications";
import {
  GoogleDriveScheduledBackupProcessor,
  QuickSyncProcessor,
} from "@/modules/google-drive-backup";
import { ScheduledTransactionsProcessor } from "@/modules/scheduled-transactions";
import { AppLockGate } from "@/modules/security";
import { TransactionAttachmentsSyncProcessor } from "@/modules/transactions";
import { VersionHistoryGate } from "@/modules/version-history";
import { DeveloperMessageGate } from "@/modules/developer-message";
import { registerWidgets, WidgetSyncProcessor } from "@/modules/widgets";
import { initializeAdsSdk } from "@/modules/ads";

registerWidgets();
void initializeAdsSdk();


LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

function RootLayoutContent() {
  const { theme } = useThemeContext();
  const pathname = usePathname();
  const usesNativeHeader =
    pathname.startsWith("/language") ||
    pathname.startsWith("/currency-setup") ||
    pathname.startsWith("/local-backup") ||
    pathname.startsWith("/google-drive-backup") ||
    pathname.startsWith("/reminder-settings") ||
    pathname.startsWith("/transactions/scheduled");

  return (
    <SafeAreaProvider
      style={[styles.rootLayer, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <KeyboardProvider>
        <DatabaseProvider>
          <LocalizationProvider>
            <CurrencyPreferencesProvider>
              <WorkspaceProvider>
                <HexColorsProvider>
                  <SafeAreaView
                    edges={usesNativeHeader ? [] : ["top"]}
                    style={[
                      styles.safeAreaBoundary,
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <AppLockGate>
                      <OnboardingGate>
                      <DeveloperMessageGate>
                      <VersionHistoryGate>
                        <>
                        <ScheduledTransactionsProcessor />
                        <TransactionAttachmentsSyncProcessor />
                        <LocalBackupProcessor />
                        <GoogleDriveScheduledBackupProcessor />
                        <QuickSyncProcessor />
                        <NotificationsReminderProcessor />
                        <WidgetSyncProcessor />

                        <ExperienceAppShell banner={<SampleWorkspaceBanner />}>
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
                            headerShown: false,
                          }}
                        />
                        <Stack.Screen
                          name="currency-setup"
                          options={{
                            presentation: "fullScreenModal",
                            headerShown: false,
                          }}
                        />
                        <Stack.Screen
                          name="local-backup"
                          options={{
                            presentation: "fullScreenModal",
                            headerShown: false,
                          }}
                        />
                        <Stack.Screen
                          name="google-drive-backup"
                          options={{
                            presentation: "fullScreenModal",
                            headerShown: false,
                          }}
                        />
                        <Stack.Screen
                          name="reminder-settings"
                          options={{
                            presentation: "fullScreenModal",
                            headerShown: false,
                          }}
                        />
                        <Stack.Screen
                          name="transactions/scheduled"
                          options={{
                            presentation: "fullScreenModal",
                            animation: "fade",
                            headerShown: false,
                          }}
                        />
                        <Stack.Screen name="monitor" />
                          </Stack>
                        </ExperienceAppShell>
                        </>
                      </VersionHistoryGate>
                      </DeveloperMessageGate>
                    </OnboardingGate>
                  </AppLockGate>
                </SafeAreaView>
                </HexColorsProvider>
              </WorkspaceProvider>
            </CurrencyPreferencesProvider>
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
