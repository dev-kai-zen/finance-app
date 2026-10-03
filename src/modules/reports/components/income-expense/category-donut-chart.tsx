import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type {
  IncomeExpenseCategoryItem,
  IncomeExpenseMode,
} from "../../types/income-expense.types";

interface CategoryDonutChartProps {
  categories: IncomeExpenseCategoryItem[];
  totalMinorUnits: number;
  transactionCount: number;
  mode: IncomeExpenseMode;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const FALLBACK_PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#64748B", // Slate
];

const SIZE = 240;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 100;
const INNER_RADIUS = 68;
const SELECTED_EXPANSION = 6;

export function CategoryDonutChart({
  categories,
  totalMinorUnits,
  transactionCount,
  mode,
  selectedCategoryId,
  onSelectCategory,
}: CategoryDonutChartProps) {
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();

  const selectedCategory = categories.find((c) => c.categoryId === selectedCategoryId);

  // If no spending or income
  if (totalMinorUnits === 0 || categories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.chartWrapper}>
          <Svg width={SIZE} height={SIZE}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={OUTER_RADIUS - 10}
              stroke={styles.emptyCircle.borderColor}
              strokeWidth={20}
              strokeDasharray="6, 6"
              fill="none"
            />
          </Svg>
          <View style={styles.centerOverlay}>
            <Text style={styles.emptyLabel}>
              No {mode === "expense" ? "expenses" : "income"}
            </Text>
            <Text style={styles.emptySubLabel}>for this period</Text>
          </View>
        </View>
      </View>
    );
  }

  // Build slices
  // Total angle is 2 * PI
  let currentAngle = -Math.PI / 2; // Start from top (12 o'clock)

  const slices = categories.map((cat, idx) => {
    const fraction = totalMinorUnits > 0 ? cat.totalMinorUnits / totalMinorUnits : 0;
    const angleSpan = fraction * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    currentAngle = endAngle;

    const isSelected = cat.categoryId === selectedCategoryId;
    const color = resolveEntityColor(cat.categoryColor) || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];

    const effectiveOuterRadius = isSelected
      ? OUTER_RADIUS + SELECTED_EXPANSION
      : OUTER_RADIUS;
    const effectiveInnerRadius = isSelected
      ? INNER_RADIUS - 2
      : INNER_RADIUS;

    // Donut slice path
    const path = describeDonutArc(
      CENTER,
      CENTER,
      effectiveInnerRadius,
      effectiveOuterRadius,
      startAngle,
      endAngle,
      categories.length > 1 ? 0.02 : 0, // tiny gap if multiple slices
    );

    return {
      category: cat,
      path,
      color,
      isSelected,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={SIZE} height={SIZE}>
          <G>
            {slices.map((slice) => (
              <Path
                key={slice.category.categoryId}
                d={slice.path}
                fill={slice.color}
                onPress={() => {
                  if (slice.isSelected) {
                    onSelectCategory(null);
                  } else {
                    onSelectCategory(slice.category.categoryId);
                  }
                }}
              />
            ))}
          </G>
        </Svg>

        {/* Center Cutout Text */}
        <View style={styles.centerOverlay} pointerEvents="none">
          {selectedCategory ? (
            <>
              <Text numberOfLines={1} style={styles.centerCategoryName}>
                {selectedCategory.categoryName}
              </Text>
              <Text numberOfLines={1} style={styles.centerAmount}>
                {formatCurrency(selectedCategory.totalMinorUnits, "PHP")}
              </Text>
              <Text style={styles.centerMeta}>
                {selectedCategory.percentage}% of total
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.centerTitle}>
                TOTAL {mode.toUpperCase()}
              </Text>
              <Text numberOfLines={1} style={styles.centerAmount}>
                {formatCurrency(totalMinorUnits, "PHP")}
              </Text>
              <Text style={styles.centerMeta}>
                {transactionCount} {transactionCount === 1 ? "transaction" : "transactions"}
              </Text>
            </>
          )}
        </View>
      </View>
      <Text style={styles.tapTip}>
        {selectedCategory ? "Tap category again to reset selection" : "Tap any slice to focus on a category"}
      </Text>
    </View>
  );
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInRadians: number,
) {
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeDonutArc(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  gapAngle: number = 0,
): string {
  // Apply gap
  let actualStart = startAngle + gapAngle / 2;
  let actualEnd = endAngle - gapAngle / 2;
  if (actualEnd <= actualStart) {
    actualStart = startAngle;
    actualEnd = endAngle;
  }

  // Check if nearly full circle
  const isFullCircle = actualEnd - actualStart >= 2 * Math.PI - 0.001;
  if (isFullCircle) {
    actualEnd = actualStart + 2 * Math.PI - 0.0001;
  }

  const largeArcFlag = actualEnd - actualStart <= Math.PI ? "0" : "1";

  const p1 = polarToCartesian(x, y, outerRadius, actualStart);
  const p2 = polarToCartesian(x, y, outerRadius, actualEnd);
  const p3 = polarToCartesian(x, y, innerRadius, actualEnd);
  const p4 = polarToCartesian(x, y, innerRadius, actualStart);

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 18,
    },
    chartWrapper: {
      width: SIZE,
      height: SIZE,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    centerOverlay: {
      position: "absolute",
      width: INNER_RADIUS * 2,
      height: INNER_RADIUS * 2,
      borderRadius: INNER_RADIUS,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    centerTitle: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: theme.colors.textMuted,
      marginBottom: 2,
      textTransform: "uppercase",
    },
    centerCategoryName: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: 2,
      textAlign: "center",
    },
    centerAmount: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
      textAlign: "center",
    },
    centerMeta: {
      fontSize: 10,
      fontWeight: "500",
      color: theme.colors.textSecondary,
      marginTop: 2,
      textAlign: "center",
    },
    emptyCircle: {
      borderColor: theme.colors.border,
    },
    emptyLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    emptySubLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginTop: 2,
    },
    tapTip: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 8,
      textAlign: "center",
    },
  });
}
