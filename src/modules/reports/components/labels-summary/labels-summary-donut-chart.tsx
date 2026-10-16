import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { IncomeExpenseMode } from "../../types/income-expense.types";
import type { LabelsSummaryItem } from "../../types/labels-summary.types";

interface LabelsSummaryDonutChartProps {
  labels: LabelsSummaryItem[];
  totalMinorUnits: number;
  transactionCount: number;
  mode: IncomeExpenseMode;
  selectedLabelId: string | null;
  onSelectLabel: (labelId: string | null) => void;
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

export function LabelsSummaryDonutChart({
  labels,
  totalMinorUnits,
  transactionCount,
  mode,
  selectedLabelId,
  onSelectLabel,
}: LabelsSummaryDonutChartProps) {
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;
  const resolveEntityColor = useResolveEntityColor();

  const selectedLabel = labels.find((l) => l.labelId === selectedLabelId);

  // If no spending or income
  if (totalMinorUnits === 0 || labels.length === 0) {
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

  const sliceSum = labels.reduce((acc, it) => acc + it.totalMinorUnits, 0);

  // Build slices
  let currentAngle = -Math.PI / 2; // Start from top (12 o'clock)

  const slices = labels.map((item, idx) => {
    const fraction = sliceSum > 0 ? item.totalMinorUnits / sliceSum : 0;
    const angleSpan = fraction * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    currentAngle = endAngle;

    const isSelected = item.labelId === selectedLabelId;
    const color =
      item.labelId === "unlabeled"
        ? "#94A3B8"
        : resolveEntityColor(item.labelColor) ||
          item.labelColor ||
          FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];

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
      labels.length > 1 ? 0.02 : 0, // tiny gap if multiple slices
    );

    return {
      item,
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
                key={slice.item.labelId}
                d={slice.path}
                fill={slice.color}
                onPress={() => {
                  if (slice.isSelected) {
                    onSelectLabel(null);
                  } else {
                    onSelectLabel(slice.item.labelId);
                  }
                }}
              />
            ))}
          </G>
        </Svg>

        {/* Center Cutout Text */}
        <View style={styles.centerOverlay} pointerEvents="none">
          {selectedLabel ? (
            <>
              <Text numberOfLines={1} style={styles.centerLabelName}>
                {selectedLabel.labelId === "unlabeled"
                  ? "Unlabeled"
                  : `#${selectedLabel.labelName}`}
              </Text>
              <Text numberOfLines={1} style={styles.centerAmount}>
                {formatCurrency(selectedLabel.totalMinorUnits, currencyCode)}
              </Text>
              <Text style={styles.centerMeta}>
                {selectedLabel.percentage}% of total
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.centerTitle}>
                TOTAL {mode.toUpperCase()}
              </Text>
              <Text numberOfLines={1} style={styles.centerAmount}>
                {formatCurrency(totalMinorUnits, currencyCode)}
              </Text>
              <Text style={styles.centerMeta}>
                {transactionCount} {transactionCount === 1 ? "transaction" : "transactions"}
              </Text>
            </>
          )}
        </View>
      </View>
      <Text style={styles.tapTip}>
        {selectedLabel
          ? "Tap label again to reset selection"
          : "Tap any slice to focus on a label"}
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
  let actualStart = startAngle + gapAngle / 2;
  let actualEnd = endAngle - gapAngle / 2;
  if (actualEnd <= actualStart) {
    actualStart = startAngle;
    actualEnd = endAngle;
  }

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
    centerLabelName: {
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
