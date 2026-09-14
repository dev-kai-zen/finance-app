import { usePathname, useRouter } from "expo-router";
import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { APP_BRAND } from "@/constants/brand";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

import { IconHelper } from "./icon-helper";

interface NavItemConfig {
  href: string;
  label: string;
  icon: "dashboard" | "accounts" | "transactions" | "categories" | "monitor" | "settings";
}

const PRIMARY_NAVIGATION_ITEMS: NavItemConfig[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/categories", label: "Categories", icon: "categories" },
];

const SECONDARY_NAVIGATION_ITEMS: NavItemConfig[] = [
  { href: "/monitor", label: "SQLite Monitor", icon: "monitor" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = memo(function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const styles = useThemeStyles(createStyles);

  const handlePress = (href: string) => {
    router.navigate(href as any);
    if (onNavigate) {
      onNavigate();
    }
  };

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <Image
          accessibilityLabel={`${APP_BRAND.name} logo`}
          resizeMode="cover"
          source={APP_BRAND.logo}
          style={styles.brandLogo}
        />
        <View style={styles.brandText}>
          <Text style={styles.brandName}>{APP_BRAND.name}</Text>
          <Text numberOfLines={2} style={styles.brandTagline}>
            {APP_BRAND.tagline}
          </Text>
        </View>
      </View>

      {/* Primary Navigation */}
      <View style={styles.primaryNav}>
        <Text style={styles.sectionLabel}>MENU</Text>
        <View style={styles.navGroup}>
          {PRIMARY_NAVIGATION_ITEMS.map((item) => {
            const active = isItemActive(item.href);
            return (
              <SidebarLink
                key={item.href}
                active={active}
                icon={item.icon}
                label={item.label}
                onPress={() => handlePress(item.href)}
              />
            );
          })}
        </View>
      </View>

      {/* Footer / Secondary Navigation */}
      <View style={styles.secondaryNav}>
        <View style={styles.divider} />
        <View style={styles.navGroup}>
          {SECONDARY_NAVIGATION_ITEMS.map((item) => {
            const active = isItemActive(item.href);
            return (
              <SidebarLink
                key={item.href}
                active={active}
                icon={item.icon}
                label={item.label}
                onPress={() => handlePress(item.href)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
});

interface SidebarLinkProps {
  label: string;
  icon: NavItemConfig["icon"];
  active: boolean;
  onPress: () => void;
}

function SidebarLink({ label, icon, active, onPress }: SidebarLinkProps) {
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
      {/* Non-color active indicator bar */}
      {active && <View style={styles.activeIndicator} />}

      <View style={styles.iconContainer}>
        <NavIcon active={active} type={icon} />
      </View>
      <Text style={[styles.linkText, active && styles.activeLinkText]}>
        {label}
      </Text>
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
    categories: "layers",
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
      backgroundColor: theme.colors.surfaceInverse,
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
    brandName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.2,
    },
    brandTagline: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      lineHeight: 16,
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
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
      backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
    activeLink: {
      backgroundColor: theme.colors.surfaceInverseElevated,
    },
    activeIndicator: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 2,
      borderTopRightRadius: 2,
      bottom: 6,
      left: 0,
      position: "absolute",
      top: 6,
      width: 3.5,
    },
    iconContainer: {
      alignItems: "center",
      height: 20,
      justifyContent: "center",
      marginRight: theme.spacing.md,
      width: 20,
    },
    linkText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    activeLinkText: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    divider: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      height: 1,
      marginHorizontal: theme.spacing.sm,
      marginVertical: theme.spacing.md,
    },
    secondaryNav: {
      paddingBottom: theme.spacing.xs,
    },
  });
}
