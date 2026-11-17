import React, { memo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { HorizontalScrollView } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { SUBSCRIPTION_FILTER_OPTIONS } from "../constants/subscription.constants";
import type { SubscriptionFilter } from "../types/subscription.types";

export interface SubscriptionFilterTabsProps {
  currentFilter: SubscriptionFilter;
  onSelectFilter: (filter: SubscriptionFilter) => void;
  counts?: Partial<Record<SubscriptionFilter, number>>;
}

export const SubscriptionFilterTabs = memo(function SubscriptionFilterTabs({
  currentFilter,
  onSelectFilter,
  counts,
}: SubscriptionFilterTabsProps) {
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <View style={styles.container}>
      <HorizontalScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUBSCRIPTION_FILTER_OPTIONS.map((opt) => {
          const isSelected = currentFilter === opt.value;
          const count = counts?.[opt.value];

          return (
            <Pressable
              key={opt.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectFilter(opt.value)}
              style={({ pressed }) => [
                styles.tab,
                isSelected && styles.tabSelected,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  isSelected && styles.tabTextSelected,
                ]}
              >
                {t(opt.labelKey as any, { defaultValue: opt.value })}
              </Text>
              {typeof count === "number" && count > 0 ? (
                <View
                  style={[
                    styles.countBadge,
                    isSelected && styles.countBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isSelected && styles.countTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </HorizontalScrollView>
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    scrollContent: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: 2,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 7,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      borderColor: "transparent",
    },
    tabSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    tabTextSelected: {
      color: "#FFFFFF",
    },
    countBadge: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    countBadgeSelected: {
      backgroundColor: "rgba(255, 255, 255, 0.25)",
    },
    countText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textSecondary,
    },
    countTextSelected: {
      color: "#FFFFFF",
    },
  });
}
