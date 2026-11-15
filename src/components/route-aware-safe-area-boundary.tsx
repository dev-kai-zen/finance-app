import { type PropsWithChildren } from "react";
import { StyleSheet } from "react-native";
import { usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const FULL_SCREEN_MODAL_PREFIXES = [
  "/language",
  "/currency-setup",
  "/data-import",
  "/local-backup",
  "/google-drive-backup",
  "/reminder-settings",
  "/support",
  "/widgets",
  "/kai-knowledge",
  "/transactions/scheduled",
] as const;

function usesModalScreenHeader(pathname: string): boolean {
  return FULL_SCREEN_MODAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Isolates pathname subscription so route changes do not re-render the root provider tree.
 */
export function RouteAwareSafeAreaBoundary({
  backgroundColor,
  children,
}: PropsWithChildren<{ backgroundColor: string }>) {
  const pathname = usePathname();
  const modalHeaderRoute = usesModalScreenHeader(pathname);

  return (
    <SafeAreaView
      edges={modalHeaderRoute ? [] : ["top"]}
      style={[styles.boundary, { backgroundColor }]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  boundary: {
    flex: 1,
  },
});
