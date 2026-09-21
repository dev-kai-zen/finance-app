import { LogBox, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppShell } from "@/components/app-shell";
import { AppThemeProvider, useThemeContext } from "@/components/theme";
import { DatabaseProvider } from "@/infrastructure/database";
import { HexColorsProvider } from "@/modules/hex-colors";

LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

function RootLayoutContent() {
  const { theme } = useThemeContext();

  return (
    <SafeAreaProvider
      style={[styles.rootLayer, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme.mode === "dark" ? "dark" : "light"} />
      <KeyboardProvider>
        <DatabaseProvider>
          <HexColorsProvider>
            <SafeAreaView
              edges={["top"]}
              style={[
                styles.safeAreaBoundary,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <AppShell>
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
                  <Stack.Screen name="categories" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="monitor" />
                </Stack>
              </AppShell>
            </SafeAreaView>
          </HexColorsProvider>
        </DatabaseProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
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
