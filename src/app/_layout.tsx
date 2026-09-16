import { LogBox, StyleSheet } from "react-native";
import { Stack } from "expo-router";
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
    <SafeAreaView
      edges={["top"]}
      style={[
        styles.safeAreaBoundary,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <AppShell>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="accounts" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="monitor" />
        </Stack>
      </AppShell>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <DatabaseProvider>
          <HexColorsProvider>
            <RootLayoutContent />
          </HexColorsProvider>
        </DatabaseProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeAreaBoundary: {
    flex: 1,
  },
});
