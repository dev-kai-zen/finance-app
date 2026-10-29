import { usePathname, useRouter } from "expo-router";
import { memo, useCallback, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { ChevronDown, Code, Crown, Mail } from "lucide-react-native";
import { APP_BRAND } from "@/constants/brand";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  useLocalization,
  type TranslationKey,
} from "@/infrastructure/localization";

import { IconHelper } from "./icon-helper";
import { MoreFeaturesModal } from "./more-features-modal";
import { ProPaywallModal, useProStatus } from "@/modules/pro";
import { useExperiencePreferences } from "@/modules/settings";
import { SearchTriggerButton } from "@/modules/search";
import { isDevModeAllowed } from "@/utils/dev-mode";
import { sendFeedback } from "@/utils/send-feedback";

interface NavItemConfig {
  href: string;
  labelKey: TranslationKey;
  icon: "dashboard" | "accounts" | "transactions" | "calendar" | "credit-cards" | "categories" | "budgets" | "goals" | "reports" | "notes" | "monitor" | "settings";
}

const PRIMARY_NAVIGATION_ITEMS: NavItemConfig[] = [
  { href: "/", labelKey: "navigation.dashboard", icon: "dashboard" },
  { href: "/accounts", labelKey: "navigation.accounts", icon: "accounts" },
  { href: "/transactions", labelKey: "navigation.transactions", icon: "transactions" },
  { href: "/calendar", labelKey: "navigation.calendar", icon: "calendar" },
  { href: "/credit-cards", labelKey: "navigation.creditCards", icon: "credit-cards" },
  { href: "/categories", labelKey: "navigation.categories", icon: "categories" },
  { href: "/budgets", labelKey: "navigation.budgets", icon: "budgets" },
  { href: "/goals", labelKey: "navigation.goals", icon: "goals" },
  { href: "/reports", labelKey: "navigation.reports", icon: "reports" },
  { href: "/notes", labelKey: "navigation.notes", icon: "notes" },
];

const SECONDARY_NAVIGATION_ITEMS: NavItemConfig[] = [
  { href: "/monitor", labelKey: "navigation.sqliteMonitor", icon: "monitor" },
  { href: "/settings", labelKey: "navigation.settings", icon: "settings" },
];

export interface SidebarProps {
  onNavigate?: () => void;
  hiddenHrefs?: string[];
}

export const Sidebar = memo(function Sidebar({
  onNavigate,
  hiddenHrefs = [],
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPro } = useProStatus();
  const isDev = isDevModeAllowed();
  const { generalSearchEnabled } = useExperiencePreferences();
  const [moreFeaturesOpen, setMoreFeaturesOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollLayoutRef = useRef({ visibleHeight: 0, contentHeight: 0, scrollY: 0 });
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkCanScrollDown = useCallback(
    (scrollY: number, visibleHeight: number, contentHeight: number) => {
      if (visibleHeight <= 0 || contentHeight <= 0) return;
      const hasMore = contentHeight - visibleHeight - scrollY > 15;
      setCanScrollDown((prev) => (prev !== hasMore ? hasMore : prev));
    },
    [],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      scrollLayoutRef.current.scrollY = scrollY;
      const { visibleHeight, contentHeight } = scrollLayoutRef.current;
      checkCanScrollDown(scrollY, visibleHeight, contentHeight);
    },
    [checkCanScrollDown],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const visibleHeight = event.nativeEvent.layout.height;
      scrollLayoutRef.current.visibleHeight = visibleHeight;
      const { scrollY, contentHeight } = scrollLayoutRef.current;
      checkCanScrollDown(scrollY, visibleHeight, contentHeight);
    },
    [checkCanScrollDown],
  );

  const handleContentSizeChange = useCallback(
    (_: number, contentHeight: number) => {
      scrollLayoutRef.current.contentHeight = contentHeight;
      const { scrollY, visibleHeight } = scrollLayoutRef.current;
      checkCanScrollDown(scrollY, visibleHeight, contentHeight);
    },
    [checkCanScrollDown],
  );

  const handleScrollDownPress = useCallback(() => {
    const { scrollY, visibleHeight, contentHeight } = scrollLayoutRef.current;
    const targetY = Math.min(
      scrollY + 140,
      Math.max(0, contentHeight - visibleHeight),
    );
    scrollViewRef.current?.scrollTo({
      y: targetY,
      animated: true,
    });
  }, []);

  const handlePress = (href: string) => {
    router.navigate(href as any);
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleFeedbackPress = useCallback(() => {
    if (onNavigate) {
      onNavigate();
    }
    void sendFeedback();
  }, [onNavigate]);

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const hidden = new Set(hiddenHrefs);
  const filterItems = (items: NavItemConfig[]) =>
    items.filter((item) => !hidden.has(item.href));

  const primaryItems = filterItems(PRIMARY_NAVIGATION_ITEMS);
  const secondaryItems = filterItems(SECONDARY_NAVIGATION_ITEMS);

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <Image
          accessibilityLabel={t("brand.logoAccessibility", {
            name: APP_BRAND.name,
          })}
          resizeMode="cover"
          source={APP_BRAND.logo}
          style={styles.brandLogo}
        />
        <View style={styles.brandText}>
          <View style={styles.brandNameRow}>
            <Text style={styles.brandName}>{APP_BRAND.name}</Text>
            {isDev ? (
              <View style={styles.headerDevChip}>
                <Code color="#22C55E" size={10} />
                <Text style={styles.headerDevChipText}>DEV</Text>
              </View>
            ) : null}
            {isPro ? (
              <View style={styles.headerProChip}>
                <Crown color="#D97706" size={10} />
                <Text style={styles.headerProChipText}>PRO</Text>
              </View>
            ) : (
              <View style={styles.headerFreeChip}>
                <Text style={styles.headerFreeChipText}>FREE</Text>
              </View>
            )}
          </View>
          <Text style={styles.brandTagline}>
            {t("brand.tagline")}
          </Text>
        </View>
      </View>

      {/* Search Trigger Bar */}
      {generalSearchEnabled && (
        <View style={styles.sidebarSearchWrapper}>
          <SearchTriggerButton onPressOverride={onNavigate} variant="bar" />
        </View>
      )}

      {/* Scrollable Navigation Body */}
      <View style={styles.scrollWrapper}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.navScrollContent}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={styles.navScroll}
        >
          {/* Primary Navigation */}
          <View style={styles.primaryNav}>
            <View style={styles.navGroup}>
              {primaryItems.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <SidebarLink
                    key={item.href}
                    active={active}
                    icon={item.icon}
                    label={t(item.labelKey)}
                    onPress={() => handlePress(item.href)}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Scroll Down Indicator */}
        {canScrollDown ? (
          <View pointerEvents="box-none" style={styles.scrollIndicatorContainer}>
            <Pressable
              accessibilityLabel={t("navigation.scrollDown")}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              onPress={handleScrollDownPress}
              style={({ pressed }) => [
                styles.scrollIndicatorButton,
                pressed && styles.scrollIndicatorButtonPressed,
              ]}
            >
              <ChevronDown color={theme.colors.textSecondary} size={16} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Secondary Navigation (Fixed at bottom) */}
      <View style={styles.secondaryNav}>
        <View style={styles.divider} />
        <View style={styles.navGroup}>
          {secondaryItems
            .filter((item) => item.href !== "/settings")
            .map((item) => {
              const active = isItemActive(item.href);
              return (
                <SidebarLink
                  key={item.href}
                  active={active}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  onPress={() => handlePress(item.href)}
                />
              );
            })}
          {/* Finance Pro item (shown only in Free tier, above More Features) */}
          {!isPro ? (
            <Pressable
              accessibilityLabel={t("pro.sidebarTitle")}
              accessibilityRole="button"
              onPress={() => setPaywallOpen(true)}
              style={({ pressed }) => [
                styles.link,
                pressed && styles.linkPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Crown color="#D97706" size={18} />
              </View>
              <Text style={[styles.linkText, styles.proLinkText]}>
                {t("pro.sidebarTitle")}
              </Text>
              <View style={styles.badgeContainer}>
                <View style={styles.sidebarUpgradeBadge}>
                  <Text style={styles.sidebarUpgradeBadgeText}>Activate</Text>
                </View>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setMoreFeaturesOpen(true)}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
          >
            <View style={styles.iconContainer}>
              <IconHelper color={theme.colors.textSecondary} name="layout-grid" size={18} />
            </View>
            <Text style={styles.linkText}>{t("navigation.moreFeatures")}</Text>
          </Pressable>
          {secondaryItems
            .filter((item) => item.href === "/settings")
            .map((item) => {
              const active = isItemActive(item.href);
              return (
                <SidebarLink
                  key={item.href}
                  active={active}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  onPress={() => handlePress(item.href)}
                />
              );
            })}

          {/* Send Feedback item */}
          <Pressable
            accessibilityLabel={t("navigation.sendFeedback")}
            accessibilityRole="button"
            onPress={handleFeedbackPress}
            style={({ pressed }) => [
              styles.link,
              pressed && styles.linkPressed,
            ]}
          >
            <View style={styles.iconContainer}>
              <Mail color={theme.colors.textSecondary} size={18} />
            </View>
            <Text style={styles.linkText}>
              {t("navigation.sendFeedback")}
            </Text>
          </Pressable>
        </View>
      </View>

      <MoreFeaturesModal
        onClose={() => setMoreFeaturesOpen(false)}
        visible={moreFeaturesOpen}
      />

      <ProPaywallModal
        onClose={() => setPaywallOpen(false)}
        visible={paywallOpen}
      />
    </View>
  );
});

interface SidebarLinkProps {
  label: string;
  icon: NavItemConfig["icon"];
  active: boolean;
  onPress: () => void;
  badge?: React.ReactNode;
}

function SidebarLink({ label, icon, active, onPress, badge }: SidebarLinkProps) {
  const styles = useThemeStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        active && styles.activeLink,
        pressed && !active && styles.linkPressed,
      ]}
    >
      <View style={styles.iconContainer}>
        <NavIcon active={active} type={icon} />
      </View>
      <Text style={[styles.linkText, active && styles.activeLinkText]}>
        {label}
      </Text>
      {badge ? <View style={styles.badgeContainer}>{badge}</View> : null}
    </Pressable>
  );
}

/**
 * Geometric, crisp micro-icons that follow theme semantic tokens directly without third-party frameworks.
 */
function NavIcon({ type, active }: { type: NavItemConfig["icon"]; active: boolean }) {
  const iconColor = useThemeStyles((theme) =>
    active ? theme.colors.primary : theme.colors.textSecondary,
  );

  const iconNameMap: Record<NavItemConfig["icon"], string> = {
    dashboard: "layout-dashboard",
    accounts: "landmark",
    transactions: "arrow-left-right",
    calendar: "calendar",
    "credit-cards": "credit-card",
    categories: "layers",
    budgets: "pie-chart",
    goals: "target",
    reports: "file-text",
    notes: "notebook-pen",
    monitor: "database",
    settings: "settings",
  };

  return <IconHelper color={iconColor} name={iconNameMap[type]} size={18} />;
}

const iconStyles = StyleSheet.create({
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 16,
    height: 16,
    justifyContent: "space-between",
    alignContent: "space-between",
  },
  square: {
    width: 6,
    height: 6,
    borderWidth: 1.5,
    borderRadius: 1.5,
  },
  cardBox: {
    width: 18,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 2.5,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  cardStripe: {
    height: 2,
    width: "100%",
  },
  txContainer: {
    width: 17,
    height: 14,
    justifyContent: "space-between",
  },
  txLineTop: {
    height: 2,
    width: "75%",
    borderRadius: 1,
  },
  txLineBottom: {
    height: 2,
    width: "100%",
    borderRadius: 1,
  },
  categoryContainer: {
    width: 16,
    height: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  circleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  tagLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  gearBox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gearCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    sidebar: {
      backgroundColor: theme.colors.surface,
      flex: 1,
      flexDirection: "column",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xl,
    },
    brandContainer: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    brandLogo: {
      borderRadius: theme.borderRadius.medium,
      flexShrink: 0,
      height: 40,
      width: 40,
    },
    brandText: {
      flex: 1,
      minWidth: 0,
    },
    brandNameRow: {
      flexWrap: "wrap",
      rowGap: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    headerDevChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: "#000000",
      borderWidth: 1,
      borderColor: "#22C55E",
    },
    headerDevChipText: {
      color: "#22C55E",
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    headerProChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(217, 119, 6, 0.4)",
    },
    headerProChipText: {
      color: "#D97706",
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    headerFreeChip: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    headerFreeChipText: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    brandName: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.2,
    },
    brandTagline: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      lineHeight: 16,
    },
    sidebarSearchWrapper: {
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    scrollWrapper: {
      flex: 1,
      position: "relative",
    },
    navScroll: {
      flex: 1,
    },
    navScrollContent: {
      paddingBottom: theme.spacing.md,
    },
    scrollIndicatorContainer: {
      alignItems: "center",
      bottom: 2,
      justifyContent: "center",
      left: 0,
      pointerEvents: "box-none",
      position: "absolute",
      right: 0,
      zIndex: 10,
    },
    scrollIndicatorButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 15,
      borderWidth: 1,
      height: 30,
      justifyContent: "center",
      width: 30,
      ...theme.shadows.card,
    },
    scrollIndicatorButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      transform: [{ scale: 0.92 }],
    },
    primaryNav: {
      flex: 1,
    },
    navGroup: {
      gap: theme.spacing.xs,
    },
    link: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      position: "relative",
    },
    linkPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    activeLink: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    iconContainer: {
      alignItems: "center",
      height: 20,
      justifyContent: "center",
      marginRight: theme.spacing.md,
      width: 20,
    },
    linkText: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    proLinkText: {
      color: "#D97706",
      fontWeight: theme.typography.fontWeight.semibold,
    },
    sidebarUpgradeBadge: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.round,
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(217, 119, 6, 0.4)",
    },
    sidebarUpgradeBadgeText: {
      color: "#D97706",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.4,
    },
    activeLinkText: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    badgeContainer: {
      flexShrink: 0,
      marginLeft: "auto",
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginHorizontal: theme.spacing.sm,
      marginVertical: theme.spacing.md,
    },
    secondaryNav: {
      paddingBottom: theme.spacing.xs,
    },
  });
}
