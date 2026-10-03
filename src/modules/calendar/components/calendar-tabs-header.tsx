import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { CalendarTab } from "../types/calendar.types";

export interface CalendarTabsHeaderProps {
  activeTab: CalendarTab;
  transactionCount: number;
  scheduleCount: number;
  onSelectTab: (tab: CalendarTab) => void;
}

export function CalendarTabsHeader({
  activeTab,
  transactionCount,
  scheduleCount,
  onSelectTab,
}: CalendarTabsHeaderProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const formatCount = (count: number) => {
    if (count > 999) return "999+";
    return String(count);
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Transactions tab"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "transactions" }}
        onPress={() => onSelectTab("transactions")}
        style={[
          styles.tab,
          activeTab === "transactions" && styles.activeTab,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.tabText,
            activeTab === "transactions" && styles.activeTabText,
          ]}
        >
          Transactions
        </Text>
        {transactionCount > 0 && (
          <View
            style={[
              styles.badge,
              activeTab === "transactions" && styles.activeBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                activeTab === "transactions" && styles.activeBadgeText,
              ]}
            >
              {formatCount(transactionCount)}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        accessibilityLabel="Schedules tab"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "schedules" }}
        onPress={() => onSelectTab("schedules")}
        style={[
          styles.tab,
          activeTab === "schedules" && styles.activeTab,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.tabText,
            activeTab === "schedules" && styles.activeTabText,
          ]}
        >
          Schedules
        </Text>
        {scheduleCount > 0 && (
          <View
            style={[
              styles.badge,
              activeTab === "schedules" && styles.activeBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                activeTab === "schedules" && styles.activeBadgeText,
              ]}
            >
              {formatCount(scheduleCount)}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        accessibilityLabel="Net Earnings tab"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "net" }}
        onPress={() => onSelectTab("net")}
        style={[
          styles.tab,
          activeTab === "net" && styles.activeTab,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.tabText,
            activeTab === "net" && styles.activeTabText,
          ]}
        >
          Net Earnings
        </Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 3,
      gap: 4,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: theme.borderRadius.small,
      gap: 4,
      minWidth: 0,
      overflow: "hidden",
    },
    activeTab: {
      backgroundColor: theme.colors.primary + "18",
    },
    tabText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    activeTabText: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    badge: {
      backgroundColor: theme.colors.border,
      borderRadius: 9,
      paddingHorizontal: 5,
      paddingVertical: 1,
      minWidth: 18,
      height: 17,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    activeBadge: {
      backgroundColor: theme.colors.primary,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.textSecondary,
    },
    activeBadgeText: {
      color: "#ffffff",
    },
  });
}
