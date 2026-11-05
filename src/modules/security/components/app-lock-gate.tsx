import type { PropsWithChildren } from "react";
import { Modal, StyleSheet, View } from "react-native";
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

  return (
    <View style={styles.container}>
      {children}
      {isLocked && (
        <Modal
          animationType="fade"
          hardwareAccelerated
          onRequestClose={() => {
            // Block hardware/gesture back button from dismissing the lock screen
          }}
          presentationStyle="fullScreen"
          statusBarTranslucent
          transparent={false}
          visible={isLocked}
        >
          <View style={[styles.container, styles.overlay, { backgroundColor: theme.colors.background }]}>
            <LockScreen />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    zIndex: 99999,
    elevation: 99999,
  },
});
