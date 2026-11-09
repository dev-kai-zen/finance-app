import { useEffect, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
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
import { X } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { NetWorthHistoryPoint } from "@/modules/dashboard/types/dashboard.types";
import { formatCurrency } from "@/utils/currency";

interface NetWorthChartProps {
  points: NetWorthHistoryPoint[];
  valuesVisible: boolean;
  currencyCode?: string;
}

const CHART_HEIGHT = 160;
const PLOT_TOP = 10;
const PLOT_BOTTOM = 26;
const PLOT_LEFT = 44;
const PLOT_RIGHT = 6;
const TOOLTIP_WIDTH = 190;

export function NetWorthChart({
  points,
  valuesVisible,
  currencyCode = "PHP",
}: NetWorthChartProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [width, setWidth] = useState(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    null,
  );
  const selectedPointIndexRef = useRef<number | null>(null);
  selectedPointIndexRef.current = selectedPointIndex;

  useEffect(() => {
    setSelectedPointIndex(null);
  }, [points]);

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

  const getClosestIndex = (locationX: number) => {
    if (points.length === 0 || width <= 0) return 0;
    const clampedX = Math.max(
      PLOT_LEFT,
      Math.min(width - PLOT_RIGHT, locationX),
    );
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < points.length; i++) {
      const px = xForIndex(i);
      const dist = Math.abs(px - clampedX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 4
        );
      },
      onPanResponderGrant: (evt) => {
        const closest = getClosestIndex(evt.nativeEvent.locationX);
        if (selectedPointIndexRef.current === closest) {
          setSelectedPointIndex(null);
        } else {
          setSelectedPointIndex(closest);
        }
      },
      onPanResponderMove: (evt) => {
        const closest = getClosestIndex(evt.nativeEvent.locationX);
        setSelectedPointIndex(closest);
      },
    }),
  ).current;

  const netWorthPath = buildPath(points, xForIndex, (point) =>
    yForValue(point.netWorthMinorUnits),
  );
  const assetsPath = buildPath(points, xForIndex, (point) =>
    yForValue(point.totalAssetsMinorUnits),
  );
  const liabilitiesPath = buildPath(points, xForIndex, (point) =>
    yForValue(Math.abs(point.totalLiabilitiesMinorUnits)),
  );

  const activePoint =
    selectedPointIndex !== null && selectedPointIndex < points.length
      ? points[selectedPointIndex]
      : null;

  return (
    <View
      accessibilityLabel="Net worth history chart showing net worth, assets, and liabilities"
      style={styles.container}
      onLayout={handleLayout}
    >
      {width > 0 ? (
        <View style={styles.chartWrapper} {...panResponder.panHandlers}>
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
              strokeWidth={2.25}
            />
            <Path
              d={liabilitiesPath}
              fill="none"
              stroke={theme.colors.danger}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.25}
            />
            <Path
              d={netWorthPath}
              fill="none"
              stroke={theme.colors.info}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.25}
            />

            {/* Active Point Indicator Guideline */}
            {selectedPointIndex !== null && activePoint ? (
              <Line
                stroke={theme.colors.primary}
                strokeDasharray="3 3"
                strokeWidth={1.5}
                x1={xForIndex(selectedPointIndex)}
                x2={xForIndex(selectedPointIndex)}
                y1={PLOT_TOP}
                y2={PLOT_TOP + plotHeight}
              />
            ) : null}

            {points.map((point, index) => {
              const x = xForIndex(index);
              const isSelected = index === selectedPointIndex;
              const showLabel = points.length <= 6 || index % 2 === 1;

              return (
                <G key={`${point.date.getTime()}-${index}`}>
                  {/* Assets Point Marker */}
                  {isSelected ? (
                    <Circle
                      cx={x}
                      cy={yForValue(point.totalAssetsMinorUnits)}
                      fill="none"
                      r={7}
                      stroke={theme.colors.success}
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <Circle
                    cx={x}
                    cy={yForValue(point.totalAssetsMinorUnits)}
                    fill={theme.colors.success}
                    r={isSelected ? 4.5 : 3}
                    stroke={theme.colors.surface}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />

                  {/* Liabilities Point Marker */}
                  {isSelected ? (
                    <Circle
                      cx={x}
                      cy={yForValue(Math.abs(point.totalLiabilitiesMinorUnits))}
                      fill="none"
                      r={7}
                      stroke={theme.colors.danger}
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <Circle
                    cx={x}
                    cy={yForValue(Math.abs(point.totalLiabilitiesMinorUnits))}
                    fill={theme.colors.danger}
                    r={isSelected ? 4.5 : 3}
                    stroke={theme.colors.surface}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />

                  {/* Net Worth Point Marker */}
                  {isSelected ? (
                    <Circle
                      cx={x}
                      cy={yForValue(point.netWorthMinorUnits)}
                      fill={`${theme.colors.info}25`}
                      r={9}
                      stroke={theme.colors.info}
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <Circle
                    cx={x}
                    cy={yForValue(point.netWorthMinorUnits)}
                    fill={theme.colors.info}
                    r={isSelected ? 5 : 3.5}
                    stroke={theme.colors.surface}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />

                  {showLabel ? (
                    <SvgText
                      fill={
                        isSelected
                          ? theme.colors.textPrimary
                          : theme.colors.textSecondary
                      }
                      fontSize={isSelected ? 11 : 10}
                      fontWeight={isSelected ? "bold" : "normal"}
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

          {/* Touch-to-Inspect Tooltip Card */}
          {activePoint && selectedPointIndex !== null ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.tooltipWrapper,
                {
                  left: Math.max(
                    PLOT_LEFT,
                    Math.min(
                      width - TOOLTIP_WIDTH - PLOT_RIGHT,
                      xForIndex(selectedPointIndex) - TOOLTIP_WIDTH / 2,
                    ),
                  ),
                },
              ]}
            >
              <View style={styles.tooltipCard}>
                <View style={styles.tooltipHeader}>
                  <Text style={styles.tooltipDate}>
                    {formatPointDate(activePoint)}
                  </Text>
                  <Pressable
                    accessibilityLabel="Close tooltip"
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={() => setSelectedPointIndex(null)}
                    style={styles.tooltipCloseBtn}
                  >
                    <X color={theme.colors.textSecondary} size={11} />
                  </Pressable>
                </View>

                <View style={styles.tooltipRow}>
                  <View
                    style={[
                      styles.tooltipDot,
                      { backgroundColor: theme.colors.info },
                    ]}
                  />
                  <Text style={styles.tooltipLabel}>Net Worth:</Text>
                  <Text
                    style={[styles.tooltipValue, { color: theme.colors.info }]}
                  >
                    {valuesVisible
                      ? formatCurrency(
                          activePoint.netWorthMinorUnits,
                          currencyCode,
                        )
                      : "••••••"}
                  </Text>
                </View>

                <View style={styles.tooltipBreakdown}>
                  <View style={styles.tooltipSubItem}>
                    <View
                      style={[
                        styles.tooltipMiniDot,
                        { backgroundColor: theme.colors.success },
                      ]}
                    />
                    <Text style={styles.tooltipSubLabel}>Assets:</Text>
                    <Text style={styles.tooltipSubValue}>
                      {valuesVisible
                        ? formatCurrency(
                            activePoint.totalAssetsMinorUnits,
                            currencyCode,
                          )
                        : "••••••"}
                    </Text>
                  </View>
                  <View style={styles.tooltipSubItem}>
                    <View
                      style={[
                        styles.tooltipMiniDot,
                        { backgroundColor: theme.colors.danger },
                      ]}
                    />
                    <Text style={styles.tooltipSubLabel}>Liab:</Text>
                    <Text style={styles.tooltipSubValue}>
                      {valuesVisible
                        ? formatCurrency(
                            activePoint.totalLiabilitiesMinorUnits,
                            currencyCode,
                          )
                        : "••••••"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </View>
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

function formatPointDate(point: NetWorthHistoryPoint): string {
  if (point.date instanceof Date && !isNaN(point.date.getTime())) {
    try {
      return point.date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return point.label;
    }
  }
  return point.label;
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
    },
    tooltipWrapper: {
      position: "absolute",
      top: 0,
      width: TOOLTIP_WIDTH,
      zIndex: 20,
    },
    tooltipCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      elevation: 6,
      gap: 3,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      ...theme.shadows.card,
    },
    tooltipHeader: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: 3,
    },
    tooltipDate: {
      color: theme.colors.textPrimary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
    },
    tooltipCloseBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 10,
      height: 18,
      justifyContent: "center",
      width: 18,
    },
    tooltipRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
    },
    tooltipDot: {
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    tooltipLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    tooltipValue: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      marginLeft: "auto",
    },
    tooltipBreakdown: {
      flexDirection: "row",
      gap: 6,
      justifyContent: "space-between",
      marginTop: 2,
    },
    tooltipSubItem: {
      alignItems: "center",
      flexDirection: "row",
      gap: 3,
    },
    tooltipMiniDot: {
      borderRadius: 2,
      height: 5,
      width: 5,
    },
    tooltipSubLabel: {
      color: theme.colors.textMuted,
      fontSize: 9,
    },
    tooltipSubValue: {
      color: theme.colors.textSecondary,
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    legend: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
      justifyContent: "center",
      paddingTop: theme.spacing.xs,
    },
    legendItem: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    legendDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    legendText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
