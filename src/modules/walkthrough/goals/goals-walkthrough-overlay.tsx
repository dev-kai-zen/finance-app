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

export interface GoalsWalkthroughOverlayProps {
  visible: boolean;
  stepIndex: number;
  totalSteps: number;
  step?: WalkthroughStep;
  targetLayout: LayoutRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFabPress?: () => void;
}

export function GoalsWalkthroughOverlay({
  visible,
  stepIndex,
  totalSteps,
  step,
  targetLayout,
  onNext,
  onPrev,
  onSkip,
  onFabPress,
}: GoalsWalkthroughOverlayProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { t } = useLocalization();

  if (!visible || !step) return null;

  const isFabStep = step.id === "goalFab";

  // Calculate cutout sizing based on target
  let cutoutPadding = 4;
  let cutoutRadius = 12;

  if (step.id === "goalTotalTargetCard") {
    cutoutPadding = 4;
    cutoutRadius = 16;
  } else if (step.id === "goalStatusFilters") {
    cutoutPadding = 4;
    cutoutRadius = 16;
  } else if (step.id === "goalFirstItemMarkComplete") {
    cutoutPadding = 4;
    cutoutRadius = 12;
  } else if (isFabStep) {
    cutoutPadding = 6;
    cutoutRadius = 34;
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

  // Tooltip position calculation (strictly outside highlighted target)
  let tooltipContainerStyle: ViewStyle;

  if (targetLayout) {
    const spaceBelow =
      windowHeight - insets.bottom - (targetLayout.y + targetLayout.height);
    const spaceAbove = targetLayout.y - insets.top;
    const tooltipEstimatedHeight = 195;

    if (spaceBelow >= tooltipEstimatedHeight + 16) {
      // Place BELOW the target
      tooltipContainerStyle = {
        position: "absolute",
        top: targetLayout.y + targetLayout.height + 14,
        left: 16,
        right: 16,
      };
    } else if (spaceAbove >= tooltipEstimatedHeight + 16) {
      // Place ABOVE the target
      tooltipContainerStyle = {
        position: "absolute",
        bottom: windowHeight - targetLayout.y + 14,
        left: 16,
        right: 16,
      };
    } else {
      // Safe fallback
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
        {/* SVG Mask Spotlight */}
        <Svg
          height={windowHeight}
          width={windowWidth}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <Mask id="goalSpotlightMask">
              {/* Solid White Base = fully visible dark overlay */}
              <Rect
                x="0"
                y="0"
                width={windowWidth}
                height={windowHeight}
                fill="#ffffff"
              />
              {/* Black Cutout = perfectly transparent hole */}
              {targetLayout ? (
                <Rect
                  x={cutoutX}
                  y={cutoutY}
                  width={cutoutW}
                  height={cutoutH}
                  rx={cutoutRadius}
                  ry={cutoutRadius}
                  fill="#000000"
                />
              ) : null}
            </Mask>
          </Defs>

          {/* Masked Dark Layer */}
          <Rect
            x="0"
            y="0"
            width={windowWidth}
            height={windowHeight}
            fill="rgba(5, 10, 20, 0.76)"
            mask="url(#goalSpotlightMask)"
          />
        </Svg>

        {/* Highlight Outline Border */}
        {targetLayout ? (
          <View
            pointerEvents="none"
            style={[
              styles.highlightBorder,
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

        {/* Interactive Forwarding on FAB Step */}
        {isFabStep && targetLayout && onFabPress ? (
          <Pressable
            accessibilityLabel="Tap new goal button"
            accessibilityRole="button"
            onPress={onFabPress}
            style={[
              styles.interactiveForwarder,
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

        {/* Tooltip Card */}
        <View style={tooltipContainerStyle} pointerEvents="box-none">
          <View style={styles.tooltipCard}>
            {/* Top Bar */}
            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <View style={styles.stepBadge}>
                  <Sparkles color={theme.colors.primary} size={12} />
                  <Text style={styles.stepBadgeText}>
                    Step {stepIndex + 1} of {totalSteps}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityLabel="Close tour"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onSkip}
                style={styles.closeBtn}
              >
                <X color={theme.colors.textMuted} size={18} />
              </Pressable>
            </View>

            {/* Title & Description */}
            <Text style={styles.stepTitle}>{t(step.titleKey as never)}</Text>
            <Text style={styles.stepDesc}>{t(step.descKey as never)}</Text>

            {/* Footer Navigation */}
            <View style={styles.cardFooter}>
              <Pressable
                accessibilityLabel="Skip walkthrough"
                accessibilityRole="button"
                onPress={onSkip}
                style={styles.skipBtn}
              >
                <Text style={styles.skipBtnText}>Skip Tour</Text>
              </Pressable>

              <View style={styles.navButtonGroup}>
                {stepIndex > 0 ? (
                  <Pressable
                    accessibilityLabel="Previous step"
                    accessibilityRole="button"
                    onPress={onPrev}
                    style={styles.prevBtn}
                  >
                    <ChevronLeft color={theme.colors.textPrimary} size={18} />
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityLabel={isLastStep ? "Finish tour" : "Next step"}
                  accessibilityRole="button"
                  onPress={onNext}
                  style={styles.nextBtn}
                >
                  <Text style={styles.nextBtnText}>
                    {isLastStep ? "Got It!" : "Next"}
                  </Text>
                  {!isLastStep ? (
                    <ChevronRight color={theme.colors.onPrimary} size={16} />
                  ) : null}
                </Pressable>
              </View>
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
    highlightBorder: {
      position: "absolute",
      borderWidth: 2,
      borderColor: theme.colors.primary,
      backgroundColor: "transparent",
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 6,
    },
    interactiveForwarder: {
      position: "absolute",
      zIndex: 50,
      backgroundColor: "transparent",
    },
    tooltipCard: {
      backgroundColor: theme.colors.surfaceElevated || theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    stepBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.round,
      backgroundColor: `${theme.colors.primary}18`,
    },
    stepBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    closeBtn: {
      padding: 4,
    },
    stepTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    stepDesc: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    skipBtn: {
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    skipBtnText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    navButtonGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    prevBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
    },
    nextBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
