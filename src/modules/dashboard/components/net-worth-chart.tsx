import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Maximize2 } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { NetWorthHistoryPoint } from "@/modules/dashboard/types/dashboard.types";

interface NetWorthChartProps {
  points: NetWorthHistoryPoint[];
  valuesVisible: boolean;
  currencyCode?: string;
  onPressChart?: () => void;
}

const CHART_HEIGHT = 160;
const PLOT_TOP = 10;
const PLOT_BOTTOM = 26;
const PLOT_LEFT = 44;
const PLOT_RIGHT = 24;

export function NetWorthChart({
  points,
  valuesVisible,
  currencyCode = "PHP",
  onPressChart,
}: NetWorthChartProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
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
    (points.length <= 1
      ? plotWidth / 2
      : (index / (points.length - 1)) * plotWidth);

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

  const zeroY = yForValue(0);
  const areaPath =
    points.length > 0
      ? `${netWorthPath} L ${xForIndex(points.length - 1)} ${zeroY} L ${xForIndex(0)} ${zeroY} Z`
      : "";

  return (
    <View
      accessibilityLabel="Net worth history chart showing net worth, assets, and liabilities"
      style={styles.container}
      onLayout={handleLayout}
    >
      {width > 0 ? (
        <Pressable
          accessibilityHint="Opens full screen inspection view"
          accessibilityLabel="Inspect net worth chart"
          accessibilityRole="button"
          onPress={onPressChart}
          style={({ pressed }) => [
            styles.chartWrapper,
            pressed && styles.chartWrapperPressed,
          ]}
        >
          <Svg height={CHART_HEIGHT} width={width}>
            <Defs>
              <LinearGradient id="inlineNwGrad" x1="0" x2="0" y1="0" y2="1">
                <Stop
                  offset="0%"
                  stopColor={theme.colors.info}
                  stopOpacity="0.18"
                />
                <Stop
                  offset="100%"
                  stopColor={theme.colors.info}
                  stopOpacity="0.0"
                />
              </LinearGradient>
            </Defs>

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

            {/* Area Fill under Net Worth */}
            {areaPath ? <Path d={areaPath} fill="url(#inlineNwGrad)" /> : null}

            {/* Assets line */}
            <Path
              d={assetsPath}
              fill="none"
              stroke={theme.colors.success}
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />

            {/* Liabilities line */}
            <Path
              d={liabilitiesPath}
              fill="none"
              stroke={theme.colors.danger}
              strokeDasharray="3 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />

            {/* Net Worth line */}
            <Path
              d={netWorthPath}
              fill="none"
              stroke={theme.colors.info}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
            />

            {points.map((point, index) => {
              const x = xForIndex(index);
              const isLastPoint = index === points.length - 1;
              const isSecondToLast = index === points.length - 2;
              const showLabel =
                points.length <= 6 ||
                isLastPoint ||
                (!isSecondToLast &&
                  index % 2 === (points.length % 2 === 1 ? 0 : 1));

              return (
                <G key={`${point.date.getTime()}-${index}`}>
                  {/* Assets Marker */}
                  <Circle
                    cx={x}
                    cy={yForValue(point.totalAssetsMinorUnits)}
                    fill={theme.colors.success}
                    r={3}
                    stroke={theme.colors.surface}
                    strokeWidth={1.5}
                  />

                  {/* Liabilities Marker */}
                  <Circle
                    cx={x}
                    cy={yForValue(Math.abs(point.totalLiabilitiesMinorUnits))}
                    fill={theme.colors.danger}
                    r={3}
                    stroke={theme.colors.surface}
                    strokeWidth={1.5}
                  />

                  {/* Net Worth Marker */}
                  <Circle
                    cx={x}
                    cy={yForValue(point.netWorthMinorUnits)}
                    fill={theme.colors.info}
                    r={isLastPoint ? 4.5 : 3.5}
                    stroke={theme.colors.surface}
                    strokeWidth={1.5}
                  />

                  {showLabel ? (
                    <SvgText
                      fill={
                        isLastPoint
                          ? theme.colors.textPrimary
                          : theme.colors.textSecondary
                      }
                      fontSize={10}
                      fontWeight={isLastPoint ? "bold" : "normal"}
                      textAnchor="middle"
                      x={x}
                      y={CHART_HEIGHT - 6}
                    >
                      {point.label}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>

          {/* Inspect Badge Hint */}
          <View pointerEvents="none" style={styles.inspectBadge}>
            <Maximize2 color={theme.colors.primary} size={11} />
            <Text style={styles.inspectBadgeText}>
              {t("netWorthInspect.tapToInspect")}
            </Text>
          </View>
        </Pressable>
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
    return {
      min: 0,
      max: 100_000,
      ticks: [100_000, 75_000, 50_000, 25_000, 0],
    };
  }

  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const range = Math.max(100, rawMax - rawMin);
  const roughStep = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceMultiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceMultiplier * magnitude;
  const min = Math.floor(rawMin / step) * step;
  const max = Math.max(step, Math.ceil(rawMax / step) * step);
  return {
    min,
    max,
    ticks: Array.from(
      { length: 5 },
      (_, index) => max - ((max - min) / 4) * index,
    ),
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
      minHeight: CHART_HEIGHT + 30,
      width: "100%",
    },
    chartWrapper: {
      position: "relative",
      width: "100%",
      borderRadius: 12,
    },
    chartWrapperPressed: {
      opacity: 0.85,
    },
    inspectBadge: {
      position: "absolute",
      top: 6,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: `${theme.colors.surfaceElevated}E6`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    inspectBadgeText: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    legend: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
      marginTop: 8,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    legendText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
  });
}
