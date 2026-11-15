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

export interface CreditCardsWalkthroughOverlayProps {
  visible: boolean;
  stepIndex: number;
  totalSteps: number;
  step?: WalkthroughStep;
  targetLayout: LayoutRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onEmptyAddPress?: () => void;
}

export function CreditCardsWalkthroughOverlay({
  visible,
  stepIndex,
  totalSteps,
  step,
  targetLayout,
  onNext,
  onPrev,
  onSkip,
  onEmptyAddPress,
}: CreditCardsWalkthroughOverlayProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { t } = useLocalization();

  if (!visible || !step) return null;

  const isEmptyAddStep = step.id === "creditCardEmptyAddButton";

  let cutoutPadding = 4;
  let cutoutRadius = 12;

  if (step.id === "creditCardDueSummary") {
    cutoutPadding = 4;
    cutoutRadius = 16;
  } else if (step.id === "creditCardAccountChips") {
    cutoutPadding = 3;
    cutoutRadius = 16;
  } else if (step.id === "creditCardLimitUtilization") {
    cutoutPadding = 4;
    cutoutRadius = 16;
  } else if (step.id === "creditCardMetrics") {
    cutoutPadding = 4;
    cutoutRadius = 12;
  } else if (step.id === "creditCardDueInstallments") {
    cutoutPadding = 4;
    cutoutRadius = 12;
  } else if (step.id === "creditCardStatements" || step.id === "creditCardUnbilled") {
    cutoutPadding = 4;
    cutoutRadius = 16;
  } else if (isEmptyAddStep) {
    cutoutPadding = 4;
    cutoutRadius = 10;
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
      top: windowHeight * 0.35,
      left: 16,
      right: 16,
    };
  }

  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onSkip}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlayContainer} pointerEvents="box-none">
        <Svg
          height={windowHeight}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={windowWidth}
        >
          <Defs>
            <Mask id="creditCardSpotlightMask">
              <Rect
                fill="#FFFFFF"
                height={windowHeight}
                width={windowWidth}
                x="0"
                y="0"
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
            fill="#000000B3"
            height={windowHeight}
            mask="url(#creditCardSpotlightMask)"
            width={windowWidth}
            x="0"
            y="0"
          />
        </Svg>

        {targetLayout ? (
          <View
            pointerEvents="none"
            style={[
              styles.focusRing,
              {
                left: cutoutX,
                top: cutoutY,
                width: cutoutW,
                height: cutoutH,
                borderRadius: cutoutRadius,
              },
            ]}
          />
        ) : null}

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

              {isEmptyAddStep && onEmptyAddPress ? (
                <Pressable
                  accessibilityLabel={t(step.titleKey as never)}
                  accessibilityRole="button"
                  onPress={onEmptyAddPress}
                  style={({ pressed }) => [
                    styles.nextBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.nextBtnText}>
                    {t(step.titleKey as never)}
                  </Text>
                  <ChevronRight color={theme.colors.onPrimary} size={16} />
                </Pressable>
              ) : (
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
                    {isLastStep
                      ? "Finish"
                      : t("dashboard.walkthroughNext")}
                  </Text>
                  {!isLastStep && (
                    <ChevronRight color={theme.colors.onPrimary} size={16} />
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlayContainer: {
      flex: 1,
    },
    focusRing: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      position: "absolute",
    },
    card: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      elevation: 10,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    cardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    stepBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    stepBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    skipIconBtn: {
      padding: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 22,
      marginBottom: 6,
    },
    cardDesc: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 16,
    },
    cardActions: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    backBtn: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    backBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    nextBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    nextBtnText: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
  });
}
