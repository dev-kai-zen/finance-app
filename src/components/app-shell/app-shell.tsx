import { PropsWithChildren, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sidebar } from "@/components/sidebar";
import {
  isTabletOrDesktop,
  LAYOUT_DIMENSIONS,
} from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export function AppShell({ children }: PropsWithChildren) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);

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
        <View style={styles.desktopPageArea}>{children}</View>
      </View>
    );
  }

  // Mobile / Narrow Tablet Layout (<768px)
  return (
    <View style={styles.mobileLayout}>
      {/* Mobile Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
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

        <View style={styles.topBarBrand}>
          <View style={styles.topBarEmblem}>
            <View style={styles.topBarEmblemInner} />
          </View>
          <Text style={styles.topBarBrandText}>Kaizen Finance</Text>
        </View>

        {/* Balance space for symmetric layout */}
        <View style={styles.topBarRightSpacer} />
      </View>

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
                paddingTop: insets.top,
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
    mobileLayout: {
      backgroundColor: theme.colors.background,
      flex: 1,
      flexDirection: "column",
    },
    topBar: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      height: LAYOUT_DIMENSIONS.topBarHeight,
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      zIndex: 10,
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
    topBarBrand: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    topBarEmblem: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 4,
      height: 20,
      justifyContent: "center",
      width: 20,
    },
    topBarEmblemInner: {
      backgroundColor: theme.colors.onPrimary,
      borderRadius: 1,
      height: 6,
      width: 6,
    },
    topBarBrandText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    topBarRightSpacer: {
      width: LAYOUT_DIMENSIONS.minTouchTarget,
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
      backgroundColor: theme.colors.surfaceInverse,
      bottom: 0,
      left: 0,
      position: "absolute",
      top: 0,
      width: LAYOUT_DIMENSIONS.drawerWidth,
      ...theme.shadows.modal,
    },
  });
}
