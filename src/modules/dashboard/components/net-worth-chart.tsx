import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Text as SvgText,
} from "react-native-svg";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { NetWorthHistoryPoint } from "@/modules/dashboard/types/dashboard.types";

interface NetWorthChartProps {
  points: NetWorthHistoryPoint[];
  valuesVisible: boolean;
}

const CHART_HEIGHT = 230;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 36;
const PLOT_LEFT = 50;
const PLOT_RIGHT = 10;

export function NetWorthChart({
  points,
  valuesVisible,
}: NetWorthChartProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth !== width) setWidth(nextWidth);
  };

  const chartValues = points.flatMap((point) => [
    point.netWorthMinorUnits,
    point.totalAssetsMinorUnits,
    Math.abs(point.totalLiabilitiesMinorUnits),
  ]);
  const { min, max, ticks } = getScale(chartValues);
  const plotWidth = Math.max(1, width - PLOT_LEFT - PLOT_RIGHT);
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const xForIndex = (index: number) =>
    PLOT_LEFT +
    (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const yForValue = (value: number) =>
    PLOT_TOP + ((max - value) / Math.max(1, max - min)) * plotHeight;
  const netWorthPath = buildPath(points, xForIndex, (point) =>
    yForValue(point.netWorthMinorUnits),
  );
  const assetsPath = buildPath(points, xForIndex, (point) =>
    yForValue(point.totalAssetsMinorUnits),
  );
  const liabilitiesPath = buildPath(points, xForIndex, (point) =>
    yForValue(Math.abs(point.totalLiabilitiesMinorUnits)),
  );

  return (
    <View
      accessibilityLabel="Net worth history chart showing net worth, assets, and liabilities"
      style={styles.container}
      onLayout={handleLayout}
    >
      {width > 0 ? (
        <Svg height={CHART_HEIGHT} width={width}>
          {ticks.map((tick) => {
            const y = yForValue(tick);
            return (
              <G key={tick}>
                <Line
                  stroke={theme.colors.border}
                  strokeDasharray="5 7"
                  strokeWidth={1}
                  x1={PLOT_LEFT}
                  x2={width - PLOT_RIGHT}
                  y1={y}
                  y2={y}
                />
                <SvgText
                  fill={theme.colors.textMuted}
                  fontSize={10}
                  textAnchor="end"
                  x={PLOT_LEFT - 8}
                  y={y + 4}
                >
                  {valuesVisible ? formatAxisValue(tick) : "•••"}
                </SvgText>
              </G>
            );
          })}

          <Line
            stroke={theme.colors.borderStrong}
            strokeWidth={1}
            x1={PLOT_LEFT}
            x2={width - PLOT_RIGHT}
            y1={PLOT_TOP + plotHeight}
            y2={PLOT_TOP + plotHeight}
          />

          <Path
            d={assetsPath}
            fill="none"
            stroke={theme.colors.success}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
          <Path
            d={liabilitiesPath}
            fill="none"
            stroke={theme.colors.danger}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
          <Path
            d={netWorthPath}
            fill="none"
            stroke={theme.colors.info}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />

          {points.map((point, index) => {
            const x = xForIndex(index);
            const showLabel =
              points.length <= 6 || index % 2 === 1;
            return (
              <G key={`${point.date.getTime()}-${index}`}>
                <Circle
                  cx={x}
                  cy={yForValue(point.totalAssetsMinorUnits)}
                  fill={theme.colors.success}
                  r={4}
                  stroke={theme.colors.surface}
                  strokeWidth={1.5}
                />
                <Circle
                  cx={x}
                  cy={yForValue(Math.abs(point.totalLiabilitiesMinorUnits))}
                  fill={theme.colors.danger}
                  r={4}
                  stroke={theme.colors.surface}
                  strokeWidth={1.5}
                />
                <Circle
                  cx={x}
                  cy={yForValue(point.netWorthMinorUnits)}
                  fill={theme.colors.info}
                  r={4.5}
                  stroke={theme.colors.surface}
                  strokeWidth={1.5}
                />
                {showLabel ? (
                  <SvgText
                    fill={theme.colors.textSecondary}
                    fontSize={10}
                    textAnchor="middle"
                    x={x}
                    y={CHART_HEIGHT - 10}
                  >
                    {point.label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}

      <View style={styles.legend}>
        <LegendItem color={theme.colors.info} label="Net Worth" />
        <LegendItem color={theme.colors.success} label="Assets" />
        <LegendItem color={theme.colors.danger} label="Liabilities" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function buildPath(
  points: NetWorthHistoryPoint[],
  xForIndex: (index: number) => number,
  yForPoint: (point: NetWorthHistoryPoint) => number,
): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForIndex(index)} ${yForPoint(point)}`,
    )
    .join(" ");
}

function getScale(values: number[]): {
  min: number;
  max: number;
  ticks: number[];
} {
  if (values.length === 0) {
    return { min: 0, max: 100_000, ticks: [100_000, 75_000, 50_000, 25_000, 0] };
  }

  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const range = Math.max(100, rawMax - rawMin);
  const roughStep = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceMultiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceMultiplier * magnitude;
  const min = Math.floor(rawMin / step) * step;
  const max = Math.max(step, Math.ceil(rawMax / step) * step);
  return {
    min,
    max,
    ticks: Array.from({ length: 5 }, (_, index) => max - ((max - min) / 4) * index),
  };
}

function formatAxisValue(minorUnits: number): string {
  const amount = minorUnits / 100;
  const absoluteAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absoluteAmount >= 1_000_000) {
    return `${sign}${(absoluteAmount / 1_000_000).toFixed(1).replace(".0", "")}M`;
  }
  if (absoluteAmount >= 1_000) {
    return `${sign}${Math.round(absoluteAmount / 1_000)}k`;
  }
  return `${sign}${Math.round(absoluteAmount)}`;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      minHeight: CHART_HEIGHT + 38,
      width: "100%",
    },
    legend: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.lg,
      justifyContent: "center",
      paddingTop: theme.spacing.sm,
    },
    legendItem: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    legendDot: {
      borderRadius: 5,
      height: 10,
      width: 10,
    },
    legendText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
