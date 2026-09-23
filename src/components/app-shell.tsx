import { type PropsWithChildren, type ReactNode, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { Sidebar } from "./sidebar";
import { SyncStatusChip } from "./sync-status-chip";
import {
  isTabletOrDesktop,
  LAYOUT_DIMENSIONS,
} from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

function getScreenTitle(pathname: string): string {
  if (pathname.startsWith("/accounts")) return "Accounts";
  if (pathname.startsWith("/transactions")) return "Transactions";
  if (pathname.startsWith("/categories")) return "Categories";
  if (pathname.startsWith("/monitor")) return "SQLite Monitor";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

export interface AppShellProps extends PropsWithChildren {
  banner?: ReactNode;
}

export function AppShell({ children, banner }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);
  const pathname = usePathname();
  const screenTitle = getScreenTitle(pathname);

  const closeDrawer = () => setIsDrawerOpen(false);
  const openDrawer = () => setIsDrawerOpen(true);

  if (isDesktop) {
    return (
      <View style={styles.desktopLayout}>
        {/* Persistent Desktop/Tablet Sidebar */}
        <View style={styles.persistentSidebar}>
          <Sidebar />
        </View>

        {/* Desktop Page Area */}
        <View style={styles.desktopPageArea}>
          <View style={styles.desktopTopBar}>
            <View style={styles.desktopTopBarBrand}>
              <Text style={styles.desktopScreenTitle}>{screenTitle}</Text>
            </View>
            <SyncStatusChip />
          </View>
          {banner}
          <View style={styles.desktopContentArea}>{children}</View>
        </View>
      </View>
    );
  }

  // Mobile / Narrow Tablet Layout (<768px)
  return (
    <View style={styles.mobileLayout}>
      {/* Mobile Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarInner}>
          <View style={styles.topLeftGroup}>
            <Pressable
              accessibilityLabel="Open navigation menu"
              accessibilityRole="button"
              onPress={openDrawer}
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.menuButtonPressed,
              ]}
            >
              {/* 3-line hamburger icon */}
              <View style={styles.hamburgerIcon}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            </Pressable>

            <Text style={styles.topBarBrandText}>{screenTitle}</Text>
          </View>

          <SyncStatusChip />
        </View>
      </View>

      {banner}

      {/* Main Content Area */}
      <View style={styles.mobileContent}>{children}</View>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <View style={styles.drawerLayer}>
          <Pressable
            accessibilityLabel="Close navigation menu"
            accessibilityRole="button"
            onPress={closeDrawer}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.drawerPanel,
              {
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <Sidebar onNavigate={closeDrawer} />
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    desktopLayout: {
      backgroundColor: theme.colors.background,
      flex: 1,
      flexDirection: "row",
    },
    persistentSidebar: {
      borderRightColor: theme.colors.border,
      borderRightWidth: 1,
      height: "100%",
      width: LAYOUT_DIMENSIONS.sidebarWidth,
    },
    desktopPageArea: {
      flex: 1,
      height: "100%",
    },
    desktopTopBar: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      height: LAYOUT_DIMENSIONS.topBarHeight,
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xl,
    },
    desktopTopBarBrand: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    desktopScreenTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    desktopContentArea: {
      flex: 1,
    },
    mobileLayout: {
      backgroundColor: theme.colors.background,
      flex: 1,
      flexDirection: "column",
    },
    topBar: {
      backgroundColor: theme.colors.background,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      height: LAYOUT_DIMENSIONS.topBarHeight,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      zIndex: 10,
    },
    topBarInner: {
      alignItems: "center",
      flexDirection: "row",
      height: LAYOUT_DIMENSIONS.topBarHeight,
      justifyContent: "space-between",
      width: "100%",
    },
    menuButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      height: LAYOUT_DIMENSIONS.minTouchTarget,
      justifyContent: "center",
      width: LAYOUT_DIMENSIONS.minTouchTarget,
    },
    menuButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    hamburgerIcon: {
      height: 14,
      justifyContent: "space-between",
      width: 18,
    },
    hamburgerLine: {
      backgroundColor: theme.colors.textPrimary,
      borderRadius: 1,
      height: 2,
      width: 18,
    },
    topLeftGroup: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    topBarBrand: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    topBarEmblem: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 5,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    topBarEmblemInner: {
      backgroundColor: theme.colors.onPrimary,
      borderRadius: 1.5,
      height: 7,
      width: 7,
    },
    topBarBrandText: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    mobileContent: {
      flex: 1,
    },
    drawerLayer: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 1000,
    },
    backdrop: {
      backgroundColor: theme.colors.overlay,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    drawerPanel: {
      backgroundColor: theme.colors.surface,
      bottom: 0,
      left: 0,
      position: "absolute",
      top: 0,
      width: LAYOUT_DIMENSIONS.drawerWidth,
      ...theme.shadows.modal,
    },
  });
}
