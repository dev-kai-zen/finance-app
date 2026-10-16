import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAppLock } from "../hooks/use-app-lock";
import { LockScreen } from "./lock-screen";

export function AppLockGate({ children }: PropsWithChildren) {
  const { isLocked, isReady } = useAppLock();
  const theme = useAppTheme();

  // If initial security status is still resolving, hold screen background
  if (!isReady) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      />
    );
  }

  // Intercept with LockScreen if locked
  if (isLocked) {
    return <LockScreen />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
