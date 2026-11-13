import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";

export interface ReportsWalkthroughOverlayProps {
  visible: boolean;
  stepIndex: number;
  totalSteps: number;
  step?: WalkthroughStep;
  targetLayout: LayoutRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function ReportsWalkthroughOverlay({
  visible,
  stepIndex,
  totalSteps,
  step,
  targetLayout,
  onNext,
  onPrev,
  onSkip,
}: ReportsWalkthroughOverlayProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { t } = useLocalization();

  if (!visible || !step) return null;

  let cutoutPadding = 4;
  let cutoutRadius = 12;

  if (step.id === "reportsTabBar" || step.id === "reportsFilterBar") {
    cutoutPadding = 4;
    cutoutRadius = 12;
  } else if (
    step.id === "reportsChart" ||
    step.id === "reportsBreakdownTable"
  ) {
    cutoutPadding = 4;
    cutoutRadius = 16;
  }

  const cutoutX = targetLayout
    ? Math.max(0, targetLayout.x - cutoutPadding)
    : 0;
  const cutoutY = targetLayout
    ? Math.max(0, targetLayout.y - cutoutPadding)
    : 0;
  const cutoutW = targetLayout
    ? targetLayout.width + cutoutPadding * 2
    : 0;
  const cutoutH = targetLayout
    ? targetLayout.height + cutoutPadding * 2
    : 0;

  let tooltipContainerStyle: ViewStyle;

  if (targetLayout) {
    const spaceBelow =
      windowHeight - insets.bottom - (targetLayout.y + targetLayout.height);
    const spaceAbove = targetLayout.y - insets.top;
    const tooltipEstimatedHeight = 195;

    if (spaceBelow >= tooltipEstimatedHeight + 16) {
      tooltipContainerStyle = {
        position: "absolute",
        top: targetLayout.y + targetLayout.height + 14,
        left: 16,
        right: 16,
      };
    } else if (spaceAbove >= tooltipEstimatedHeight + 16) {
      tooltipContainerStyle = {
        position: "absolute",
        bottom: windowHeight - targetLayout.y + 14,
        left: 16,
        right: 16,
      };
    } else {
      tooltipContainerStyle = {
        position: "absolute",
        bottom: Math.max(20, insets.bottom + 16),
        left: 16,
        right: 16,
      };
    }
  } else {
    tooltipContainerStyle = {
      position: "absolute",
      bottom: Math.max(20, insets.bottom + 16),
      left: 16,
      right: 16,
    };
  }

  const isLastStep = stepIndex >= totalSteps - 1;

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated={true}
      onRequestClose={onSkip}
      statusBarTranslucent={true}
      transparent={true}
      visible={visible}
    >
      <View style={styles.modalRoot}>
        {/* SVG Spotlight Mask */}
        <Svg
          height={windowHeight}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={windowWidth}
        >
          <Defs>
            <Mask id="reportsMask">
              <Rect
                fill="#FFFFFF"
                height={windowHeight}
                width={windowWidth}
                x={0}
                y={0}
              />
              {targetLayout ? (
                <Rect
                  fill="#000000"
                  height={cutoutH}
                  rx={cutoutRadius}
                  ry={cutoutRadius}
                  width={cutoutW}
                  x={cutoutX}
                  y={cutoutY}
                />
              ) : null}
            </Mask>
          </Defs>
          <Rect
            fill="rgba(0, 0, 0, 0.72)"
            height={windowHeight}
            mask="url(#reportsMask)"
            width={windowWidth}
            x={0}
            y={0}
          />
        </Svg>

        {/* Highlight Ring around Target */}
        {targetLayout ? (
          <View
            pointerEvents="none"
            style={[
              styles.spotlightRing,
              {
                top: cutoutY,
                left: cutoutX,
                width: cutoutW,
                height: cutoutH,
                borderRadius: cutoutRadius,
              },
            ]}
          />
        ) : null}

        {/* Tooltip Card */}
        <View style={tooltipContainerStyle}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  {t("dashboard.walkthroughStepCount", {
                    current: stepIndex + 1,
                    total: totalSteps,
                  })}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t("dashboard.walkthroughSkip")}
                accessibilityRole="button"
                hitSlop={8}
                onPress={onSkip}
                style={({ pressed }) => [
                  styles.skipIconBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <X color={theme.colors.textSecondary} size={16} />
              </Pressable>
            </View>

            <Text style={styles.cardTitle}>{t(step.titleKey as never)}</Text>
            <Text style={styles.cardDesc}>{t(step.descKey as never)}</Text>

            <View style={styles.cardActions}>
              {stepIndex > 0 ? (
                <Pressable
                  accessibilityLabel={t("dashboard.walkthroughBack")}
                  accessibilityRole="button"
                  onPress={onPrev}
                  style={({ pressed }) => [
                    styles.backBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <ChevronLeft color={theme.colors.textSecondary} size={16} />
                  <Text style={styles.backBtnText}>
                    {t("dashboard.walkthroughBack")}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityLabel={t("dashboard.walkthroughSkip")}
                  accessibilityRole="button"
                  onPress={onSkip}
                  style={({ pressed }) => [
                    styles.backBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.backBtnText}>
                    {t("dashboard.walkthroughSkip")}
                  </Text>
                </Pressable>
              )}

              <Pressable
                accessibilityLabel={
                  isLastStep
                    ? "Finish Walkthrough"
                    : t("dashboard.walkthroughNext")
                }
                accessibilityRole="button"
                onPress={onNext}
                style={({ pressed }) => [
                  styles.nextBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.nextBtnText}>
                  {isLastStep ? "Finish" : t("dashboard.walkthroughNext")}
                </Text>
                {!isLastStep && (
                  <ChevronRight color={theme.colors.onPrimary} size={16} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalRoot: {
      flex: 1,
    },
    spotlightRing: {
      position: "absolute",
      borderWidth: 2,
      borderColor: "#00A3FF",
      backgroundColor: "transparent",
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 12,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    stepBadge: {
      backgroundColor: `${theme.colors.primary}18`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    stepBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    skipIconBtn: {
      padding: 4,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    cardDesc: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textSecondary,
      marginBottom: 16,
    },
    cardActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    backBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#00A3FF",
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    nextBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
  });
}

