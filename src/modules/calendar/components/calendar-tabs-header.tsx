import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Crown } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { CalendarTab } from "../types/calendar.types";

export interface CalendarTabsHeaderProps {
  activeTab: CalendarTab;
  transactionCount: number;
  scheduleCount: number;
  onSelectTab: (tab: CalendarTab) => void;
  isPro?: boolean;
  transactionsRef?: React.Ref<View>;
  schedulesRef?: React.Ref<View>;
  netRef?: React.Ref<View>;
  balanceSheetRef?: React.Ref<View>;
}

export function CalendarTabsHeader({
  activeTab,
  transactionCount,
  scheduleCount,
  onSelectTab,
  isPro = true,
  transactionsRef,
  schedulesRef,
  netRef,
  balanceSheetRef,
}: CalendarTabsHeaderProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const formatCount = (count: number) => {
    if (count > 999) return "999+";
    return String(count);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          accessibilityLabel="Transactions tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "transactions" }}
          collapsable={false}
          onPress={() => onSelectTab("transactions")}
          ref={transactionsRef}
          style={[
            styles.tab,
            activeTab === "transactions" && styles.activeTab,
          ]}
        >
          <Text
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
          collapsable={false}
          onPress={() => onSelectTab("schedules")}
          ref={schedulesRef}
          style={[
            styles.tab,
            activeTab === "schedules" && styles.activeTab,
          ]}
        >
          <Text
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
          collapsable={false}
          onPress={() => onSelectTab("net")}
          ref={netRef}
          style={[
            styles.tab,
            activeTab === "net" && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "net" && styles.activeTabText,
            ]}
          >
            Net Earnings
          </Text>
          {!isPro && (
            <View style={styles.proChip}>
              <Crown color="#D97706" size={8} />
              <Text style={styles.proChipText}>PRO</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Balance Sheet tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "balance_sheet" }}
          collapsable={false}
          onPress={() => onSelectTab("balance_sheet")}
          ref={balanceSheetRef}
          style={[
            styles.tab,
            activeTab === "balance_sheet" && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "balance_sheet" && styles.activeTabText,
            ]}
          >
            Balance Sheet
          </Text>
          {!isPro && (
            <View style={styles.proChip}>
              <Crown color="#D97706" size={8} />
              <Text style={styles.proChipText}>PRO</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 3,
    },
    scrollContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 2,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.small,
      gap: 6,
      flexShrink: 0,
    },
    activeTab: {
      backgroundColor: theme.colors.primary + "18",
    },
    tabText: {
      fontSize: 13,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    badge: {
      backgroundColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 18,
      height: 18,
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
    proChip: {
      alignItems: "center",
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      borderColor: "rgba(217, 119, 6, 0.4)",
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    proChipText: {
      color: "#D97706",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
}
