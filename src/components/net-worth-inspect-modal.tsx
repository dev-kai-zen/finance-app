import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  Info,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useRegisterActiveModal } from "@/hooks";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { triggerHaptic } from "@/modules/settings";
import { formatCurrency } from "@/utils/currency";

export interface NetWorthInspectPoint {
  date: Date;
  label: string;
  netWorthMinorUnits: number;
  totalAssetsMinorUnits: number;
  totalLiabilitiesMinorUnits: number;
  diffFromPriorMinorUnits?: number | null;
  diffPercentage?: number | null;
  formattedNetWorth?: string;
  formattedAssets?: string;
  formattedLiabilities?: string;
}

export interface NetWorthInspectModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  points: NetWorthInspectPoint[];
  currencyCode?: string;
  valuesVisible?: boolean;
  periods?: string[];
  activePeriod?: string;
  onSelectPeriod?: (period: string) => void;
  initialPointIndex?: number | null;
}

const CHART_HEIGHT = 220;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 32;
const PLOT_LEFT = 50;
const PLOT_RIGHT = 22;

export function NetWorthInspectModal({
  visible,
  onClose,
  title,
  points,
  currencyCode = "PHP",
  valuesVisible = true,
  periods,
  activePeriod,
  onSelectPeriod,
  initialPointIndex,
}: NetWorthInspectModalProps) {
  useRegisterActiveModal(visible);

  // Early-return visibility guard (Section 19 Performance Rule)
  if (!visible) return null;

  return (
    <NetWorthInspectModalContent
      activePeriod={activePeriod}
      currencyCode={currencyCode}
      initialPointIndex={initialPointIndex}
      onClose={onClose}
      onSelectPeriod={onSelectPeriod}
      periods={periods}
      points={points}
      title={title}
      valuesVisible={valuesVisible}
      visible={visible}
    />
  );
}

function NetWorthInspectModalContent({
  visible,
  onClose,
  title,
  points,
  currencyCode = "PHP",
  valuesVisible = true,
  periods,
  activePeriod,
  onSelectPeriod,
  initialPointIndex,
}: NetWorthInspectModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [chartWidth, setChartWidth] = useState(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(() => {
    if (
      typeof initialPointIndex === "number" &&
      initialPointIndex >= 0 &&
      initialPointIndex < points.length
    ) {
      return initialPointIndex;
    }
    return Math.max(0, points.length - 1);
  });

  const selectedPointIndexRef = useRef(selectedPointIndex);
  selectedPointIndexRef.current = selectedPointIndex;

  const chartWrapperRef = useRef<View>(null);
  const chartLayoutXRef = useRef<number>(0);

  // When points array changes (e.g. period switched), reset to last point
  useEffect(() => {
    if (points.length > 0) {
      setSelectedPointIndex(points.length - 1);
    }
  }, [points]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== chartWidth) {
      setChartWidth(w);
    }
  };

  const plotWidth = Math.max(1, chartWidth - PLOT_LEFT - PLOT_RIGHT);
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;

  // Scale calculation
  const allValues = useMemo(() => {
    return points.flatMap((p) => [
      p.netWorthMinorUnits,
      p.totalAssetsMinorUnits,
      Math.abs(p.totalLiabilitiesMinorUnits),
    ]);
  }, [points]);

  const { min, max, ticks } = useMemo(() => getScale(allValues), [allValues]);

  const xForIndex = (index: number) => {
    if (points.length <= 1) return PLOT_LEFT + plotWidth / 2;
    return PLOT_LEFT + (index / (points.length - 1)) * plotWidth;
  };

  const yForValue = (val: number) => {
    const range = Math.max(1, max - min);
    return PLOT_TOP + ((max - val) / range) * plotHeight;
  };

  const getClosestIndexFromX = (xCoord: number) => {
    if (points.length === 0) return 0;
    const clampedX = Math.max(
      PLOT_LEFT,
      Math.min(chartWidth - PLOT_RIGHT, xCoord),
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
        return Math.abs(gestureState.dx) > 3;
      },
      onPanResponderGrant: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const closest = getClosestIndexFromX(touchX);
        if (closest !== selectedPointIndexRef.current) {
          triggerHaptic("light");
          setSelectedPointIndex(closest);
        }
      },
      onPanResponderMove: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const closest = getClosestIndexFromX(touchX);
        if (closest !== selectedPointIndexRef.current) {
          triggerHaptic("light");
          setSelectedPointIndex(closest);
        }
      },
    }),
  ).current;

  // Paths
  const netWorthCoords = points.map((p, i) => ({
    x: xForIndex(i),
    y: yForValue(p.netWorthMinorUnits),
  }));
  const assetsCoords = points.map((p, i) => ({
    x: xForIndex(i),
    y: yForValue(p.totalAssetsMinorUnits),
  }));
  const liabCoords = points.map((p, i) => ({
    x: xForIndex(i),
    y: yForValue(Math.abs(p.totalLiabilitiesMinorUnits)),
  }));

  const netWorthPath = buildLinePath(netWorthCoords);
  const assetsPath = buildLinePath(assetsCoords);
  const liabPath = buildLinePath(liabCoords);

  const zeroY = yForValue(0);
  const areaPath =
    netWorthCoords.length > 0
      ? `${netWorthPath} L ${netWorthCoords[netWorthCoords.length - 1].x} ${zeroY} L ${netWorthCoords[0].x} ${zeroY} Z`
      : "";

  const activePoint =
    selectedPointIndex >= 0 && selectedPointIndex < points.length
      ? points[selectedPointIndex]
      : points[points.length - 1] ?? null;

  // Comparison vs prior point
  const comparison = useMemo(() => {
    if (!activePoint || selectedPointIndex <= 0) return null;
    const priorPoint = points[selectedPointIndex - 1];
    if (!priorPoint) return null;

    const diff = activePoint.netWorthMinorUnits - priorPoint.netWorthMinorUnits;
    const isPositive = diff >= 0;
    const percentage =
      priorPoint.netWorthMinorUnits !== 0
        ? Math.round(
            (Math.abs(diff) / Math.abs(priorPoint.netWorthMinorUnits)) * 1000,
          ) / 10
        : null;

    return {
      diff,
      isPositive,
      percentage,
      priorLabel: priorPoint.label,
    };
  }, [activePoint, points, selectedPointIndex]);

  const activePointX =
    selectedPointIndex >= 0 && selectedPointIndex < points.length
      ? xForIndex(selectedPointIndex)
      : null;

  const headerTitle = title ?? t("netWorthInspect.title");
  const privateMask = "••••••";

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      visible={visible}
    >
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={styles.container}
      >
        {/* Modal Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <ChevronLeft color={theme.colors.textPrimary} size={28} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {headerTitle}
            </Text>
          </View>
        </View>

        {/* Optional Period Pills Bar */}
        {periods && periods.length > 0 && onSelectPeriod ? (
          <View style={styles.periodSelector}>
            {periods.map((option) => {
              const isSelected = option === activePeriod;
              return (
                <Pressable
                  key={option}
                  accessibilityLabel={`Show ${option} net worth history`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    triggerHaptic("light");
                    onSelectPeriod(option);
                  }}
                  style={({ pressed }) => [
                    styles.periodButton,
                    isSelected && styles.periodButtonSelected,
                    pressed && !isSelected && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      isSelected && styles.periodTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(24, insets.bottom + 16) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Chart Card */}
          <View style={styles.chartCard}>
            <View
              ref={chartWrapperRef}
              collapsable={false}
              onLayout={handleLayout}
              style={styles.chartWrapper}
            >
              {chartWidth > 0 && points.length > 0 ? (
                <>
                  <Svg height={CHART_HEIGHT} width={chartWidth}>
                    <Defs>
                      <LinearGradient
                        id="inspectGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <Stop
                          offset="0%"
                          stopColor={theme.colors.primary}
                          stopOpacity="0.25"
                        />
                        <Stop
                          offset="100%"
                          stopColor={theme.colors.primary}
                          stopOpacity="0.0"
                        />
                      </LinearGradient>
                    </Defs>

                    {/* Y-Axis Grid Lines & Tick Labels */}
                    {ticks.map((tick) => {
                      const y = yForValue(tick);
                      return (
                        <G key={`tick-${tick}`}>
                          <Line
                            stroke={`${theme.colors.border}80`}
                            strokeDasharray="4 6"
                            strokeWidth={1}
                            x1={PLOT_LEFT}
                            x2={chartWidth - PLOT_RIGHT}
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
                            {valuesVisible ? formatShortAxis(tick) : "•••"}
                          </SvgText>
                        </G>
                      );
                    })}

                    {/* Base Axis Line */}
                    <Line
                      stroke={theme.colors.borderStrong}
                      strokeWidth={1}
                      x1={PLOT_LEFT}
                      x2={chartWidth - PLOT_RIGHT}
                      y1={PLOT_TOP + plotHeight}
                      y2={PLOT_TOP + plotHeight}
                    />

                    {/* Area Fill */}
                    {areaPath ? (
                      <Path d={areaPath} fill="url(#inspectGradient)" />
                    ) : null}

                    {/* Assets Path (Green dashed) */}
                    <Path
                      d={assetsPath}
                      fill="none"
                      stroke={theme.colors.success}
                      strokeDasharray="5 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />

                    {/* Liabilities Path (Red dashed) */}
                    <Path
                      d={liabPath}
                      fill="none"
                      stroke={theme.colors.danger}
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />

                    {/* Net Worth Path (Primary solid) */}
                    <Path
                      d={netWorthPath}
                      fill="none"
                      stroke={theme.colors.info}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                    />

                    {/* Active Month Vertical Guideline */}
                    {activePointX !== null ? (
                      <Line
                        stroke={theme.colors.primary}
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                        x1={activePointX}
                        x2={activePointX}
                        y1={PLOT_TOP}
                        y2={PLOT_TOP + plotHeight}
                      />
                    ) : null}

                    {/* Point Markers & Month Labels */}
                    {points.map((pt, idx) => {
                      const px = xForIndex(idx);
                      const isSelected = idx === selectedPointIndex;
                      const pyNet = yForValue(pt.netWorthMinorUnits);
                      const pyAssets = yForValue(pt.totalAssetsMinorUnits);
                      const pyLiab = yForValue(
                        Math.abs(pt.totalLiabilitiesMinorUnits),
                      );

                      const showLabel = shouldShowLabel(
                        pt,
                        idx,
                        points.length,
                        isSelected,
                        activePeriod,
                      );

                      return (
                        <G key={`pt-${pt.label}-${idx}`}>
                          {/* Assets Dot */}
                          {isSelected ? (
                            <Circle
                              cx={px}
                              cy={pyAssets}
                              fill="none"
                              r={6}
                              stroke={theme.colors.success}
                              strokeWidth={1.5}
                            />
                          ) : null}
                          <Circle
                            cx={px}
                            cy={pyAssets}
                            fill={theme.colors.success}
                            r={isSelected ? 4 : 2.5}
                            stroke={theme.colors.surface}
                            strokeWidth={1.5}
                          />

                          {/* Liabilities Dot */}
                          {isSelected ? (
                            <Circle
                              cx={px}
                              cy={pyLiab}
                              fill="none"
                              r={6}
                              stroke={theme.colors.danger}
                              strokeWidth={1.5}
                            />
                          ) : null}
                          <Circle
                            cx={px}
                            cy={pyLiab}
                            fill={theme.colors.danger}
                            r={isSelected ? 4 : 2.5}
                            stroke={theme.colors.surface}
                            strokeWidth={1.5}
                          />

                          {/* Net Worth Dot */}
                          {isSelected ? (
                            <Circle
                              cx={px}
                              cy={pyNet}
                              fill={`${theme.colors.info}30`}
                              r={10}
                              stroke={theme.colors.info}
                              strokeWidth={2}
                            />
                          ) : null}
                          <Circle
                            cx={px}
                            cy={pyNet}
                            fill={theme.colors.info}
                            r={isSelected ? 5.5 : 3.5}
                            stroke={theme.colors.surface}
                            strokeWidth={isSelected ? 2 : 1.5}
                          />

                          {/* X-Axis Month Label */}
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
                              x={px}
                              y={CHART_HEIGHT - 8}
                            >
                              {pt.label.split(" ")[0]}
                            </SvgText>
                          ) : null}
                        </G>
                      );
                    })}
                  </Svg>

                  {/* Guaranteed Seamless Touch Target Columns & Gesture Area */}
                  <View
                    pointerEvents="box-none"
                    style={StyleSheet.absoluteFill}
                    {...panResponder.panHandlers}
                  >
                    {points.map((pt, idx) => {
                      const px = xForIndex(idx);
                      const halfStep =
                        points.length > 1
                          ? plotWidth / (points.length - 1) / 2
                          : plotWidth / 2;
                      const colLeft = Math.max(0, px - halfStep);
                      const colWidth = halfStep * 2;

                      return (
                        <Pressable
                          key={`touch-${idx}`}
                          accessibilityLabel={`Select ${pt.label}`}
                          accessibilityRole="button"
                          onPress={() => {
                            triggerHaptic("light");
                            setSelectedPointIndex(idx);
                          }}
                          style={[
                            styles.touchColumn,
                            {
                              left: colLeft,
                              width: colWidth,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {t("netWorthInspect.noData")}
                  </Text>
                </View>
              )}
            </View>

            {/* Interactive Chart Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: theme.colors.info },
                  ]}
                />
                <Text style={styles.legendText}>
                  {t("netWorthInspect.netWorth")}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: theme.colors.success },
                  ]}
                />
                <Text style={styles.legendText}>
                  {t("netWorthInspect.assets")}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: theme.colors.danger },
                  ]}
                />
                <Text style={styles.legendText}>
                  {t("netWorthInspect.liabilities")}
                </Text>
              </View>
            </View>
          </View>

          {/* Dedicated Bottom Inspector Card */}
          {activePoint ? (
            <View style={styles.inspectorCard}>
              {/* Header row with date and trend pill */}
              <View style={styles.inspectorHeader}>
                <View style={styles.inspectorDateBadge}>
                  <Calendar color={theme.colors.primary} size={15} />
                  <Text style={styles.inspectorDateText}>
                    {formatFullMonthYear(activePoint)}
                  </Text>
                </View>

                {comparison ? (
                  <View
                    style={[
                      styles.trendPill,
                      comparison.isPositive
                        ? styles.trendPillPositive
                        : styles.trendPillNegative,
                    ]}
                  >
                    {comparison.isPositive ? (
                      <TrendingUp color={theme.colors.success} size={13} />
                    ) : (
                      <TrendingDown color={theme.colors.danger} size={13} />
                    )}
                    <Text
                      style={[
                        styles.trendPillText,
                        comparison.isPositive
                          ? styles.trendTextPositive
                          : styles.trendTextNegative,
                      ]}
                    >
                      {comparison.percentage !== null
                        ? `${comparison.isPositive ? "+" : ""}${comparison.percentage}%`
                        : `${comparison.isPositive ? "+" : ""}`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.latestBadge}>
                    <Text style={styles.latestBadgeText}>
                      {t("netWorthInspect.noPriorData")}
                    </Text>
                  </View>
                )}
              </View>

              {/* Net Worth Hero Display */}
              <View style={styles.heroSection}>
                <Text style={styles.heroLabel}>
                  {t("netWorthInspect.netWorth")}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  numberOfLines={1}
                  style={[styles.heroValue, { color: theme.colors.info }]}
                >
                  {valuesVisible
                    ? formatCurrency(
                        activePoint.netWorthMinorUnits,
                        currencyCode,
                      )
                    : privateMask}
                </Text>

                {comparison && valuesVisible ? (
                  <Text style={styles.comparisonSubtext}>
                    {comparison.isPositive ? "+" : ""}
                    {formatCurrency(comparison.diff, currencyCode)}{" "}
                    {t("netWorthInspect.vsPrevious")} ({comparison.priorLabel})
                  </Text>
                ) : null}
              </View>

              {/* Assets and Liabilities Breakdown Grid */}
              <View style={styles.breakdownRow}>
                {/* Assets Card */}
                <View style={[styles.breakdownCard, styles.assetCard]}>
                  <View style={styles.breakdownHeader}>
                    <View
                      style={[
                        styles.indicatorDot,
                        { backgroundColor: theme.colors.success },
                      ]}
                    />
                    <Text style={styles.breakdownLabel}>
                      {t("netWorthInspect.assets")}
                    </Text>
                  </View>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    style={[
                      styles.breakdownAmount,
                      { color: theme.colors.success },
                    ]}
                  >
                    {valuesVisible
                      ? formatCurrency(
                          activePoint.totalAssetsMinorUnits,
                          currencyCode,
                        )
                      : privateMask}
                  </Text>
                </View>

                {/* Liabilities Card */}
                <View style={[styles.breakdownCard, styles.liabilityCard]}>
                  <View style={styles.breakdownHeader}>
                    <View
                      style={[
                        styles.indicatorDot,
                        { backgroundColor: theme.colors.danger },
                      ]}
                    />
                    <Text style={styles.breakdownLabel}>
                      {t("netWorthInspect.liabilities")}
                    </Text>
                  </View>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    style={[
                      styles.breakdownAmount,
                      { color: theme.colors.danger },
                    ]}
                  >
                    {valuesVisible
                      ? formatCurrency(
                          Math.abs(activePoint.totalLiabilitiesMinorUnits),
                          currencyCode,
                        )
                      : privateMask}
                  </Text>
                </View>
              </View>

              {/* Interactive Help Hint */}
              <View style={styles.hintContainer}>
                <Info color={theme.colors.textMuted} size={13} />
                <Text style={styles.hintText}>
                  {t("netWorthInspect.inspectHint")}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function buildLinePath(coords: Array<{ x: number; y: number }>): string {
  if (coords.length === 0) return "";
  return coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
}

function shouldShowLabel(
  point: NetWorthInspectPoint,
  index: number,
  total: number,
  isSelected: boolean,
  period?: string,
): boolean {
  if (period === "1W") return true;
  if (period === "1Y") {
    const m = point.date.getMonth();
    return m === 0 || m === 3 || m === 6 || m === 8 || m === 11;
  }
  if (period === "ALL") return true;
  if (isSelected) return true;
  if (total <= 6) return true;
  if (index === total - 1) return true;
  if (index === total - 2) return false;
  if (total <= 12) return index % 2 === (total % 2 === 1 ? 0 : 1);
  return index % 3 === (total % 3 === 1 ? 0 : 1);
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

function formatShortAxis(minorUnits: number): string {
  const amount = minorUnits / 100;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}k`;
  }
  return `${sign}${Math.round(abs)}`;
}

function formatFullMonthYear(point: NetWorthInspectPoint): string {
  if (point.date instanceof Date && !isNaN(point.date.getTime())) {
    try {
      return point.date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    } catch {
      return point.label;
    }
  }
  return point.label;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.xs,
    },
    headerButton: {
      padding: 6,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonPressed: {
      opacity: 0.6,
      backgroundColor: theme.colors.surfaceElevated,
    },
    headerTitleContainer: {
      flex: 1,
      minWidth: 0,
      justifyContent: "center",
      marginLeft: theme.spacing.xs,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "left",
    },
    periodSelector: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 8,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: "transparent",
    },
    periodButtonSelected: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: theme.colors.primary,
    },
    periodText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    periodTextSelected: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    chartCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    chartWrapper: {
      width: "100%",
      height: CHART_HEIGHT,
      position: "relative",
    },
    touchColumn: {
      position: "absolute",
      top: 0,
      bottom: 0,
    },
    legendRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: `${theme.colors.border}60`,
      marginTop: 4,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    inspectorCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    inspectorHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    inspectorDateBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: `${theme.colors.primary}12`,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    inspectorDateText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    trendPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },
    trendPillPositive: {
      backgroundColor: `${theme.colors.success}18`,
    },
    trendPillNegative: {
      backgroundColor: `${theme.colors.danger}18`,
    },
    trendPillText: {
      fontSize: 12,
      fontWeight: "700",
    },
    trendTextPositive: {
      color: theme.colors.success,
    },
    trendTextNegative: {
      color: theme.colors.danger,
    },
    latestBadge: {
      backgroundColor: theme.colors.surfaceElevated,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    latestBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    heroSection: {
      gap: 4,
      paddingVertical: 4,
    },
    heroLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    heroValue: {
      fontSize: 30,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    comparisonSubtext: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    breakdownRow: {
      flexDirection: "row",
      gap: 12,
    },
    breakdownCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      gap: 6,
      borderWidth: 1,
    },
    assetCard: {
      backgroundColor: `${theme.colors.success}08`,
      borderColor: `${theme.colors.success}25`,
    },
    liabilityCard: {
      backgroundColor: `${theme.colors.danger}08`,
      borderColor: `${theme.colors.danger}25`,
    },
    breakdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    indicatorDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    breakdownLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    breakdownAmount: {
      fontSize: 17,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    hintContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      justifyContent: "center",
      paddingTop: 4,
    },
    hintText: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontStyle: "italic",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontStyle: "italic",
    },
  });
}

