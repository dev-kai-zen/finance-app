import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type {
  IncomeExpenseCategoryItem,
  IncomeExpenseMode,
} from "../../types/income-expense.types";

interface CategoryBreakdownTableProps {
  categories: IncomeExpenseCategoryItem[];
  totalMinorUnits: number;
  transactionCount: number;
  mode: IncomeExpenseMode;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryBreakdownTable({
  categories,
  totalMinorUnits,
  transactionCount,
  mode,
  selectedCategoryId,
  onSelectCategory,
}: CategoryBreakdownTableProps) {
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;
  const resolveEntityColor = useResolveEntityColor();

  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tableHeader}>
        <Text style={styles.headerTitle}>
          {mode === "expense" ? "SPENDING" : "EARNINGS"} BY CATEGORY
        </Text>
        <Text style={styles.headerSubtitle}>
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </Text>
      </View>

      <View style={styles.list}>
        {categories.map((item, index) => {
          const isSelected = item.categoryId === selectedCategoryId;
          const color =
            resolveEntityColor(item.categoryColor) ||
            styles.defaultBadgeColor.color;

          return (
            <Pressable
              key={item.categoryId}
              accessibilityRole="button"
              accessibilityLabel={`${item.categoryName}, ${formatCurrency(
                item.totalMinorUnits,
                currencyCode,
              )}, ${item.percentage}% of total`}
              onPress={() => {
                if (isSelected) {
                  onSelectCategory(null);
                } else {
                  onSelectCategory(item.categoryId);
                }
              }}
              style={({ pressed }) => [
                styles.row,
                isSelected && styles.selectedRow,
                pressed && styles.pressedRow,
              ]}
            >
              {/* Rank */}
              <Text style={styles.rankText}>#{index + 1}</Text>

              {/* Category Icon Badge */}
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: `${color}20`,
                    borderColor: `${color}40`,
                  },
                ]}
              >
                <IconHelper
                  color={color}
                  name={item.categoryIcon || (mode === "income" ? "wallet" : "tag")}
                  size={15}
                />
              </View>

              {/* Category Info & Progress Bar */}
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.categoryName}>
                    {item.categoryName}
                  </Text>
                  <Text style={styles.amountText}>
                    {formatCurrency(item.totalMinorUnits, currencyCode)}
                  </Text>
                </View>

                {/* Progress bar representing share */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(1, item.percentage))}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.percentageText}>
                    {item.percentage}% of total
                  </Text>
                  <Text style={styles.countText}>
                    {item.transactionCount}{" "}
                    {item.transactionCount === 1 ? "transaction" : "transactions"}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Summary Footer */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerTotalLabel}>
            TOTAL {mode.toUpperCase()}
          </Text>
          <Text style={styles.footerCountText}>
            {transactionCount} {transactionCount === 1 ? "transaction" : "transactions"}
          </Text>
        </View>
        <Text style={styles.footerTotalAmount}>
          {formatCurrency(totalMinorUnits, currencyCode)}
        </Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    tableHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: theme.colors.textMuted,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    list: {
      gap: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
      gap: 10,
    },
    selectedRow: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}12`,
    },
    pressedRow: {
      opacity: 0.8,
    },
    rankText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
      width: 22,
    },
    iconBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
    },
    defaultBadgeColor: {
      color: theme.colors.primary,
    },
    infoCol: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    categoryName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    amountText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    progressBarTrack: {
      height: 5,
      backgroundColor: `${theme.colors.border}80`,
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 4,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    percentageText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    countText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 2,
      borderTopColor: theme.colors.border,
    },
    footerLeft: {
      gap: 2,
    },
    footerTotalLabel: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: theme.colors.textPrimary,
    },
    footerCountText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    footerTotalAmount: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
  });
}
