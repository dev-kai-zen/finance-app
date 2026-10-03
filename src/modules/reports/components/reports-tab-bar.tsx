import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { REPORT_TABS } from "../constants/reports.constants";
import type { ReportTabKey } from "../types/reports.types";

interface ReportsTabBarProps {
  activeTab: ReportTabKey;
  onSelectTab: (tabKey: ReportTabKey) => void;
}

export function ReportsTabBar({ activeTab, onSelectTab }: ReportsTabBarProps) {
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {REPORT_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (tab.isAvailable) {
                  onSelectTab(tab.key);
                }
              }}
              style={({ pressed }) => [
                styles.tabPill,
                isActive && styles.activeTabPill,
                !tab.isAvailable && styles.disabledTabPill,
                pressed && tab.isAvailable && styles.pressedTabPill,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel,
                  !tab.isAvailable && styles.disabledTabLabel,
                ]}
              >
                {tab.label}
              </Text>
              {tab.badge ? (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingVertical: 10,
    },
    scrollContent: {
      paddingHorizontal: 16,
      gap: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    tabPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeTabPill: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    disabledTabPill: {
      opacity: 0.6,
    },
    pressedTabPill: {
      opacity: 0.85,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    activeTabLabel: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    disabledTabLabel: {
      color: theme.colors.textMuted,
    },
    badgeContainer: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: "700",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
    },
  });
}
