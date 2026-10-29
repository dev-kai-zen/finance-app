import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { CategorySpendingItem } from "../types/dashboard.types";

export interface DashboardTopCategoriesCardProps {
  categories: CategorySpendingItem[];
  currencyCode?: string;
  onViewCategories?: () => void;
  onPressCategory?: (categoryId: string) => void;
}

export function DashboardTopCategoriesCard({
  categories,
  currencyCode = "PHP",
  onViewCategories,
  onPressCategory,
}: DashboardTopCategoriesCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const resolveEntityColor = useResolveEntityColor();

  const topItems = categories.slice(0, 5);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("dashboard.topCategoriesCardTitle")}
        </Text>
        {onViewCategories ? (
          <Pressable
            accessibilityRole="button"
            onPress={onViewCategories}
            style={({ pressed }) => [
              styles.viewAllButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.viewAllText}>{t("dashboard.viewAll")}</Text>
            <ArrowRight color={theme.colors.primary} size={15} />
          </Pressable>
        ) : null}
      </View>

      {topItems.length === 0 ? (
        <Text style={styles.emptyText}>
          {t("dashboard.noSpendingThisMonth")}
        </Text>
      ) : (
        <View style={styles.list}>
          {topItems.map((item) => {
            const catColor = resolveEntityColor(
              item.categoryColor,
              theme.colors.primary,
            );
            const iconName = item.categoryIcon || "tag";

            return (
              <Pressable
                accessibilityRole="button"
                disabled={!onPressCategory}
                key={item.categoryId}
                onPress={() => onPressCategory?.(item.categoryId)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && onPressCategory && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: `${catColor}20`,
                      borderColor: `${catColor}40`,
                    },
                  ]}
                >
                  <IconHelper color={catColor} name={iconName} size={15} />
                </View>

                <View style={styles.infoCol}>
                  <View style={styles.labelRow}>
                    <Text numberOfLines={1} style={styles.categoryName}>
                      {item.categoryName}
                    </Text>
                    <Text style={styles.amountText}>
                      {formatCurrency(item.totalMinorUnits, currencyCode)}
                    </Text>
                  </View>

                  <View style={styles.barRow}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: catColor,
                            width: `${Math.max(4, Math.min(100, item.percentage))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.percentText}>{item.percentage}%</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      gap: theme.spacing.sm,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    title: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.2,
    },
    viewAllButton: {
      flexShrink: 0,
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 34,
      paddingHorizontal: theme.spacing.xs,
    },
    viewAllText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      paddingVertical: theme.spacing.sm,
    },
    list: {
      gap: theme.spacing.md,
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    infoCol: {
      flex: 1,
      gap: 6,
      minWidth: 0,
    },
    labelRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    categoryName: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    amountText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.bold,
    },
    barRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    barTrack: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      flex: 1,
      height: 6,
      overflow: "hidden",
    },
    barFill: {
      borderRadius: theme.borderRadius.round,
      height: "100%",
    },
    percentText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
      minWidth: 32,
      textAlign: "right",
    },
    pressed: {
      opacity: 0.75,
    },
  });
}

