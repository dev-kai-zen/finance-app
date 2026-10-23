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
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";

export interface BudgetFormWalkthroughOverlayProps {
  visible: boolean;
  stepIndex: number;
  totalSteps: number;
  step?: WalkthroughStep;
  targetLayout: LayoutRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function BudgetFormWalkthroughOverlay({
  visible,
  stepIndex,
  totalSteps,
  step,
  targetLayout,
  onNext,
  onPrev,
  onSkip,
}: BudgetFormWalkthroughOverlayProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { t } = useLocalization();

  if (!visible || !step) return null;

  const cutoutPadding = 4;
  const cutoutRadius = 12;

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

  if (!targetLayout) {
    tooltipContainerStyle = {
      position: "absolute",
      top: "40%",
      left: 16,
      right: 16,
    };
  } else {
    const spaceBelow = windowHeight - (cutoutY + cutoutH);
    const spaceAbove = cutoutY;
    const cardEstimatedHeight = 180;

    if (spaceBelow >= cardEstimatedHeight + 16) {
      tooltipContainerStyle = {
        position: "absolute",
        top: cutoutY + cutoutH + 12,
        left: 16,
        right: 16,
      };
    } else if (spaceAbove >= cardEstimatedHeight + 16) {
      tooltipContainerStyle = {
        position: "absolute",
        bottom: windowHeight - cutoutY + 12,
        left: 16,
        right: 16,
      };
    } else {
      tooltipContainerStyle = {
        position: "absolute",
        bottom: Math.max(insets.bottom + 16, 24),
        left: 16,
        right: 16,
      };
    }
  }

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  const titleText = t(step.titleKey as any);
  const descText = t(step.descKey as any);

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onSkip}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View pointerEvents="box-none" style={styles.overlayContainer}>
        {/* SVG Inverted Mask */}
        <Svg
          height={windowHeight}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={windowWidth}
        >
          <Defs>
            <Mask id="budgetFormMask">
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
            mask="url(#budgetFormMask)"
            width={windowWidth}
            x={0}
            y={0}
          />
        </Svg>

        {/* Focus Ring */}
        {targetLayout ? (
          <View
            pointerEvents="none"
            style={[
              styles.focusRing,
              {
                borderRadius: cutoutRadius,
                height: cutoutH,
                left: cutoutX,
                top: cutoutY,
                width: cutoutW,
              },
            ]}
          />
        ) : null}

        {/* Tooltip Card */}
        <View style={tooltipContainerStyle}>
          <View style={styles.card}>
            {/* Header: Step counter badge + Close/Skip */}
            <View style={styles.cardHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  Step {stepIndex + 1} of {totalSteps}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Close walkthrough"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onSkip}
                style={styles.skipIconBtn}
              >
                <X color={theme.colors.textMuted} size={18} />
              </Pressable>
            </View>

            {/* Content */}
            <Text style={styles.cardTitle}>{titleText}</Text>
            <Text style={styles.cardDesc}>{descText}</Text>

            {/* Footer Navigation */}
            <View style={styles.cardActions}>
              {!isFirstStep ? (
                <Pressable
                  accessibilityLabel="Previous step"
                  accessibilityRole="button"
                  onPress={onPrev}
                  style={styles.backBtn}
                >
                  <ChevronLeft color={theme.colors.textSecondary} size={16} />
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
              ) : (
                <View />
              )}

              <Pressable
                accessibilityLabel={isLastStep ? "Finish walkthrough" : "Next step"}
                accessibilityRole="button"
                onPress={onNext}
                style={({ pressed }) => [
                  styles.nextBtn,
                  pressed && styles.nextBtnPressed,
                ]}
              >
                <Text style={styles.nextBtnText}>
                  {isLastStep ? "Finish" : t("dashboard.walkthroughNext")}
                </Text>
                {isLastStep ? (
                  <Sparkles color="#FFFFFF" size={15} />
                ) : (
                  <ChevronRight color="#FFFFFF" size={16} />
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
    overlayContainer: {
      flex: 1,
      position: "relative",
    },
    focusRing: {
      borderColor: "#00A3FF",
      borderWidth: 2,
      position: "absolute",
      backgroundColor: "transparent",
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      elevation: 12,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
    },
    cardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    stepBadge: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    stepBadgeText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    skipIconBtn: {
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      lineHeight: 22,
    },
    cardDesc: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    cardActions: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    backBtn: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    backBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    nextBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    nextBtnPressed: {
      opacity: 0.85,
    },
    nextBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
