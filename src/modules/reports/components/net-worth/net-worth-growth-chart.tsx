import React, { useState } from "react";
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
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatPrivacyAmount, usePrivacyMode } from "@/modules/settings";
import { formatCurrency } from "@/utils/currency";
import { REPORT_COLORS } from "../../constants/reports.constants";
import type { NetWorthPoint } from "../../types/net-worth-growth.types";

interface NetWorthGrowthChartProps {
  points: NetWorthPoint[];
  selectedPointIndex: number | null;
  onSelectPointIndex: (index: number | null) => void;
  onPressChart?: () => void;
}

const CHART_HEIGHT = 190;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 28;
const PLOT_LEFT = 42;
const PLOT_RIGHT = 22;

export function NetWorthGrowthChart({
  points,
  selectedPointIndex,
  onSelectPointIndex,
  onPressChart,
}: NetWorthGrowthChartProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPrivate } = usePrivacyMode();
  const { preferences } = useCurrencyPreferences();
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== containerWidth) setContainerWidth(w);
  };

  const selectedPoint =
    selectedPointIndex !== null && points[selectedPointIndex]
      ? points[selectedPointIndex]
      : null;

  const netColor = selectedPoint
    ? !preferences.colorAmounts || isPrivate
      ? theme.colors.textPrimary
      : selectedPoint.color
    : theme.colors.textPrimary;

  if (points.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No historical data available.</Text>
      </View>
    );
  }

  // Calculate Max & Min values across all 3 curves
  let maxVal = -Infinity;
  let minVal = Infinity;

  for (const pt of points) {
    const liabMag = Math.abs(pt.totalLiabilitiesMinorUnits);
    const high = Math.max(pt.netWorthMinorUnits, pt.totalAssetsMinorUnits, liabMag);
    const low = Math.min(pt.netWorthMinorUnits, pt.totalAssetsMinorUnits, 0);

    if (high > maxVal) maxVal = high;
    if (low < minVal) minVal = low;
  }

  if (!Number.isFinite(maxVal)) maxVal = 100000;
  if (!Number.isFinite(minVal) || minVal > 0) minVal = 0;

  // Add 10% headroom
  const valRange = Math.max(1000, maxVal - minVal);
  const scaleMax = maxVal + valRange * 0.1;
  const scaleMin = minVal >= 0 ? 0 : minVal - valRange * 0.05;

  const plotWidth = Math.max(1, containerWidth - PLOT_LEFT - PLOT_RIGHT);
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;

  const getX = (idx: number) => {
    if (points.length <= 1) return PLOT_LEFT + plotWidth / 2;
    return PLOT_LEFT + (idx / (points.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const ratio = (val - scaleMin) / Math.max(1, scaleMax - scaleMin);
    return PLOT_TOP + plotHeight - ratio * plotHeight;
  };

  // Build SVG Paths
  const netWorthCoords = points.map((p, i) => ({ x: getX(i), y: getY(p.netWorthMinorUnits) }));
  const assetsCoords = points.map((p, i) => ({ x: getX(i), y: getY(p.totalAssetsMinorUnits) }));
  const liabCoords = points.map((p, i) => ({
    x: getX(i),
    y: getY(Math.abs(p.totalLiabilitiesMinorUnits)),
  }));

  const netWorthPath = buildLinePath(netWorthCoords);
  const assetsPath = buildLinePath(assetsCoords);
  const liabPath = buildLinePath(liabCoords);

  // Area fill path for Net Worth
  const zeroY = getY(0);
  const areaPath =
    netWorthCoords.length > 0
      ? `${netWorthPath} L ${netWorthCoords[netWorthCoords.length - 1].x} ${zeroY} L ${netWorthCoords[0].x} ${zeroY} Z`
      : "";

  return (
    <View style={styles.container}>
      {/* Legend & Detail Header */}
      <View style={styles.legendRow}>
        <View style={styles.legendLeft}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.netDot]} />
            <Text style={styles.legendLabel}>Net Worth</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.assetDot]} />
            <Text style={styles.legendLabel}>Assets</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.liabDot]} />
            <Text style={styles.legendLabel}>Debt</Text>
          </View>
        </View>

        {selectedPoint ? (
          <Text style={styles.selectedDetailLabel}>
            {selectedPoint.label}:{" "}
            <Text style={[styles.selectedDetailAmount, { color: netColor }]}>
              {formatPrivacyAmount(
                `${selectedPoint.formattedNetWorth} ${selectedPoint.symbol}`.trim(),
                isPrivate,
              )}
            </Text>
          </Text>
        ) : (
          <Text style={styles.hintText}>
            {t("netWorthInspect.tapToInspect")}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityHint="Opens full screen inspection view"
        accessibilityLabel="Inspect net worth chart"
        accessibilityRole="button"
        onLayout={handleLayout}
        onPress={onPressChart}
        style={({ pressed }) => [
          styles.chartWrapper,
          pressed && styles.chartWrapperPressed,
        ]}
      >
        {containerWidth > 0 ? (
          <>
            <Svg width={containerWidth} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0%"
                    stopColor={styles.primaryCurve.color}
                    stopOpacity="0.3"
                  />
                  <Stop
                    offset="100%"
                    stopColor={styles.primaryCurve.color}
                    stopOpacity="0.0"
                  />
                </LinearGradient>
              </Defs>

              {/* Grid lines */}
              <Line
                stroke={styles.gridLine.borderColor}
                strokeWidth={1}
                x1={PLOT_LEFT}
                x2={containerWidth - PLOT_RIGHT}
                y1={zeroY}
                y2={zeroY}
              />
              <Line
                stroke={styles.gridLine.borderColor}
                strokeDasharray="4, 4"
                strokeWidth={1}
                x1={PLOT_LEFT}
                x2={containerWidth - PLOT_RIGHT}
                y1={PLOT_TOP}
                y2={PLOT_TOP}
              />

              {/* Y Axis text */}
              <SvgText
                fill={styles.axisText.color}
                fontSize={9}
                textAnchor="end"
                x={PLOT_LEFT - 6}
                y={PLOT_TOP + 4}
              >
                {formatShortK(scaleMax)}
              </SvgText>
              <SvgText
                fill={styles.axisText.color}
                fontSize={9}
                textAnchor="end"
                x={PLOT_LEFT - 6}
                y={zeroY + 3}
              >
                {formatShortK(scaleMin)}
              </SvgText>

              {/* Area Fill */}
              {areaPath ? <Path d={areaPath} fill="url(#nwGradient)" /> : null}

              {/* Assets Line (Green) */}
              <Path
                d={assetsPath}
                fill="none"
                stroke={REPORT_COLORS.positiveGreen}
                strokeDasharray="4, 3"
                strokeWidth={2}
              />

              {/* Liabilities Line (Red) */}
              <Path
                d={liabPath}
                fill="none"
                stroke={REPORT_COLORS.negativeRed}
                strokeDasharray="3, 3"
                strokeWidth={1.5}
              />

              {/* Net Worth Line (Primary Solid) */}
              <Path
                d={netWorthPath}
                fill="none"
                stroke={styles.primaryCurve.color}
                strokeWidth={3}
              />

              {/* Points on Net Worth Line */}
              {netWorthCoords.map((coord, idx) => {
                const isSelected = idx === selectedPointIndex;
                const pt = points[idx];

                return (
                  <G key={pt.label + idx}>
                    {isSelected ? (
                      <Line
                        stroke={styles.primaryCurve.color}
                        strokeDasharray="3, 3"
                        strokeWidth={1}
                        x1={coord.x}
                        x2={coord.x}
                        y1={PLOT_TOP}
                        y2={PLOT_TOP + plotHeight}
                      />
                    ) : null}

                    <Circle
                      cx={coord.x}
                      cy={coord.y}
                      fill={styles.primaryCurve.color}
                      r={isSelected ? 6 : 4}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />

                    {/* X Axis Month Label */}
                    {shouldShowXLabel(idx, points.length, isSelected) ? (
                      <SvgText
                        fill={
                          isSelected
                            ? styles.selectedAxisText.color
                            : styles.axisText.color
                        }
                        fontSize={10}
                        fontWeight={isSelected ? "bold" : "normal"}
                        textAnchor="middle"
                        x={coord.x}
                        y={CHART_HEIGHT - 8}
                      >
                        {pt.label.split(" ")[0]}
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
          </>
        ) : null}
      </Pressable>
    </View>
  );
}

function buildLinePath(coords: Array<{ x: number; y: number }>): string {
  if (coords.length === 0) return "";
  return coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
}

function shouldShowXLabel(
  index: number,
  total: number,
  isSelected: boolean = false,
): boolean {
  if (isSelected) return true;
  if (total <= 6) return true;
  if (index === total - 1) return true;
  if (index === total - 2) return false;
  if (total <= 12) return index % 2 === (total % 2 === 1 ? 0 : 1);
  return index % 3 === (total % 3 === 1 ? 0 : 1);
}

function formatShortK(cents: number): string {
  const pesos = Math.round(cents / 100);
  if (Math.abs(pesos) >= 1000000) {
    return `${(pesos / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(pesos) >= 1000) {
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
    chartWrapper: {
      width: "100%",
      position: "relative",
    },
    chartWrapperPressed: {
      opacity: 0.85,
    },
    inspectBadge: {
      position: "absolute",
      top: 4,
      right: 4,
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
    netDot: {
      backgroundColor: theme.colors.primary,
    },
    assetDot: {
      backgroundColor: REPORT_COLORS.positiveGreen,
    },
    liabDot: {
      backgroundColor: REPORT_COLORS.negativeRed,
    },
    legendLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    selectedDetailLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    selectedDetailAmount: {
      fontSize: 12,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    hintText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    primaryCurve: {
      color: theme.colors.primary,
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
