import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { CategorySpendingItem } from "../types/dashboard.types";

export interface CategorySpendingCardProps {
  categories: CategorySpendingItem[];
  currencyCode?: string;
}

export function CategorySpendingCard({
  categories,
  currencyCode = "PHP",
}: CategorySpendingCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>SPENDING BY CATEGORY</Text>
        <Text style={styles.countBadge}>Top {Math.min(5, categories.length)}</Text>
      </View>

      {categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No expenses recorded for this month.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {categories.slice(0, 5).map((item) => {
            const catColor = resolveEntityColor(item.categoryColor);

            return (
              <View key={item.categoryId} style={styles.row}>
                {/* Category Icon Badge */}
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: `${catColor}20`,
                      borderColor: `${catColor}40`,
                    },
                  ]}
                >
                  <IconHelper
                    color={catColor}
                    name={item.categoryIcon || "tag"}
                    size={16}
                  />
                </View>

                {/* Category Info & Progress Bar */}
                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text numberOfLines={1} style={styles.nameText}>
                      {item.categoryName}
                    </Text>
                    <Text style={styles.amountText}>
                      {formatCurrency(item.totalMinorUnits, currencyCode, true)}
                    </Text>
                  </View>

                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            backgroundColor: catColor,
                            width: `${Math.min(100, Math.max(2, item.percentage))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.percentText}>{item.percentage}%</Text>
                  </View>
                </View>
              </View>
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
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    title: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    countBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 6,
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontStyle: "italic",
    },
    list: {
      gap: 14,
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
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
    },
    nameRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 5,
    },
    nameText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    amountText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    progressRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    progressTrack: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 3,
      flex: 1,
      height: 6,
      overflow: "hidden",
    },
    progressBar: {
      borderRadius: 3,
      height: "100%",
    },
    percentText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      minWidth: 32,
      textAlign: "right",
    },
  });
}
