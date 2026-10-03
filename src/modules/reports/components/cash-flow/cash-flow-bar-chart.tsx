import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import { REPORT_COLORS } from "../../constants/reports.constants";
import type { CashFlowRowItem } from "../../types/cash-flow.types";

interface CashFlowBarChartProps {
  periods: CashFlowRowItem[];
  selectedPeriodKey: string | null;
  onSelectPeriod: (periodKey: string | null) => void;
}

const CHART_HEIGHT = 180;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 28;
const PLOT_LEFT = 40;
const PLOT_RIGHT = 12;

export function CashFlowBarChart({
  periods,
  selectedPeriodKey,
  onSelectPeriod,
}: CashFlowBarChartProps) {
  const styles = useThemeStyles(createStyles);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== containerWidth) setContainerWidth(w);
  };

  const selectedPeriod = periods.find((p) => p.periodKey === selectedPeriodKey);

  // If no periods or empty
  if (periods.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No cash flow data available for this range.</Text>
      </View>
    );
  }

  // Calculate Scale Max
  let maxVal = 0;
  for (const p of periods) {
    if (p.inflowMinorUnits > maxVal) maxVal = p.inflowMinorUnits;
    if (p.outflowMinorUnits > maxVal) maxVal = p.outflowMinorUnits;
  }
  // Ensure non-zero scale
  if (maxVal === 0) maxVal = 100000;

  // Add 15% headroom for top label clearance
  const scaleMax = maxVal * 1.15;

  const plotWidth = Math.max(1, containerWidth - PLOT_LEFT - PLOT_RIGHT);
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;

  const slotWidth = plotWidth / periods.length;
  const barWidth = Math.max(4, Math.min(18, (slotWidth - 8) / 2));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Chart Legend & Highlight header */}
      <View style={styles.legendRow}>
        <View style={styles.legendLeft}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.inflowDot]} />
            <Text style={styles.legendLabel}>Inflow</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.outflowDot]} />
            <Text style={styles.legendLabel}>Outflow</Text>
          </View>
        </View>

        {selectedPeriod ? (
          <Text style={styles.selectedDetailText}>
            {selectedPeriod.periodLabel}: Net {selectedPeriod.formattedNet} {selectedPeriod.symbol}
          </Text>
        ) : (
          <Text style={styles.hintText}>Tap a month to inspect</Text>
        )}
      </View>

      {/* Svg Chart */}
      {containerWidth > 0 ? (
        <Svg width={containerWidth} height={CHART_HEIGHT}>
          {/* Baseline Zero Line */}
          <Line
            x1={PLOT_LEFT}
            y1={PLOT_TOP + plotHeight}
            x2={containerWidth - PLOT_RIGHT}
            y2={PLOT_TOP + plotHeight}
            stroke={styles.gridLine.borderColor}
            strokeWidth={1}
          />

          {/* Grid lines (Mid and Top) */}
          <Line
            x1={PLOT_LEFT}
            y1={PLOT_TOP + plotHeight / 2}
            x2={containerWidth - PLOT_RIGHT}
            y2={PLOT_TOP + plotHeight / 2}
            stroke={styles.gridLine.borderColor}
            strokeWidth={1}
            strokeDasharray="4, 4"
          />

          {/* Y Axis Labels */}
          <SvgText
            x={PLOT_LEFT - 6}
            y={PLOT_TOP + 4}
            fontSize={9}
            fill={styles.axisText.color}
            textAnchor="end"
          >
            {formatShortK(scaleMax)}
          </SvgText>
          <SvgText
            x={PLOT_LEFT - 6}
            y={PLOT_TOP + plotHeight / 2 + 3}
            fontSize={9}
            fill={styles.axisText.color}
            textAnchor="end"
          >
            {formatShortK(scaleMax / 2)}
          </SvgText>
          <SvgText
            x={PLOT_LEFT - 6}
            y={PLOT_TOP + plotHeight + 3}
            fontSize={9}
            fill={styles.axisText.color}
            textAnchor="end"
          >
            0
          </SvgText>

          {/* Bars per Period */}
          {periods.map((p, idx) => {
            const slotX = PLOT_LEFT + idx * slotWidth;
            const centerX = slotX + slotWidth / 2;
            const isSelected = p.periodKey === selectedPeriodKey;

            // Inflow Bar
            const inflowHeight = (p.inflowMinorUnits / scaleMax) * plotHeight;
            const inflowY = PLOT_TOP + plotHeight - inflowHeight;
            const inflowX = centerX - barWidth - 1;

            // Outflow Bar
            const outflowHeight = (p.outflowMinorUnits / scaleMax) * plotHeight;
            const outflowY = PLOT_TOP + plotHeight - outflowHeight;
            const outflowX = centerX + 1;

            return (
              <React.Fragment key={p.periodKey}>
                {/* Selection Pillar Background */}
                {isSelected ? (
                  <Rect
                    x={slotX + 2}
                    y={PLOT_TOP - 6}
                    width={slotWidth - 4}
                    height={plotHeight + 10}
                    rx={6}
                    fill={styles.selectionPillar.backgroundColor}
                  />
                ) : null}

                {/* Inflow Bar (Green) */}
                <Rect
                  x={inflowX}
                  y={inflowY}
                  width={barWidth}
                  height={Math.max(2, inflowHeight)}
                  rx={2}
                  fill={REPORT_COLORS.positiveGreen}
                  onPress={() => {
                    onSelectPeriod(isSelected ? null : p.periodKey);
                  }}
                />

                {/* Outflow Bar (Red) */}
                <Rect
                  x={outflowX}
                  y={outflowY}
                  width={barWidth}
                  height={Math.max(2, outflowHeight)}
                  rx={2}
                  fill={REPORT_COLORS.negativeRed}
                  onPress={() => {
                    onSelectPeriod(isSelected ? null : p.periodKey);
                  }}
                />

                {/* X Axis Month Label */}
                <SvgText
                  x={centerX}
                  y={CHART_HEIGHT - 8}
                  fontSize={10}
                  fontWeight={isSelected ? "bold" : "normal"}
                  fill={
                    isSelected
                      ? styles.selectedAxisText.color
                      : styles.axisText.color
                  }
                  textAnchor="middle"
                >
                  {p.periodLabel.split(" ")[0]}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

function formatShortK(cents: number): string {
  const pesos = Math.round(cents / 100);
  if (pesos >= 1000000) {
    return `${(pesos / 1000000).toFixed(1)}M`;
  }
  if (pesos >= 1000) {
    return `${Math.round(pesos / 1000)}k`;
  }
  return String(pesos);
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
    },
    legendRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    legendLeft: {
      flexDirection: "row",
      gap: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    inflowDot: {
      backgroundColor: REPORT_COLORS.positiveGreen,
    },
    outflowDot: {
      backgroundColor: REPORT_COLORS.negativeRed,
    },
    legendLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    selectedDetailText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    hintText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    gridLine: {
      borderColor: `${theme.colors.border}80`,
    },
    axisText: {
      color: theme.colors.textMuted,
    },
    selectedAxisText: {
      color: theme.colors.primary,
    },
    selectionPillar: {
      backgroundColor: `${theme.colors.primary}12`,
    },
    emptyContainer: {
      paddingVertical: 32,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontStyle: "italic",
    },
  });
}
