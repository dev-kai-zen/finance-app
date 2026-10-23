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
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Sparkles,
  X,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";

export interface DashboardWalkthroughOverlayProps {
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

export function DashboardWalkthroughOverlay({
  visible,
  stepIndex,
  totalSteps,
  step,
  targetLayout,
  onNext,
  onPrev,
  onSkip,
  onFabPress,
}: DashboardWalkthroughOverlayProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { t } = useLocalization();

  if (!visible || !step) return null;

  const isSimulated = !!step.isSimulatedModal;
  const isFabStep = step.id === "fabButton";

  // Calculate cutout sizing
  let cutoutPadding = 6;
  let cutoutRadius = 14;

  if (
    step.id === "collapseIcon" ||
    step.id === "settingsIcon" ||
    step.id === "eyeIcon"
  ) {
    cutoutPadding = 6;
    cutoutRadius = 24;
  } else if (isFabStep) {
    cutoutPadding = 6;
    cutoutRadius = 34;
  } else if (step.id === "netWorthCard" || step.id === "recentTxCard") {
    cutoutPadding = 4;
    cutoutRadius = theme.borderRadius.large;
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

  // Tooltip position calculation (strictly outside highlighted component)
  let tooltipContainerStyle: ViewStyle;

  if (isSimulated) {
    // Above simulated bottom sheet
    tooltipContainerStyle = {
      position: "absolute",
      bottom: Math.max(260, insets.bottom + 230),
      left: 16,
      right: 16,
    };
  } else if (targetLayout) {
    const spaceBelow =
      windowHeight - insets.bottom - (targetLayout.y + targetLayout.height);
    const spaceAbove = targetLayout.y - insets.top;
    const tooltipEstimatedHeight = 190;

    if (spaceBelow >= tooltipEstimatedHeight + 16) {
      // Comfortably place BELOW the target
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
      // In extreme cases on tiny screens, place at the bottom safe area
      tooltipContainerStyle = {
        position: "absolute",
        bottom: Math.max(20, insets.bottom + 16),
        left: 16,
        right: 16,
      };
    }
  } else {
    // Fallback centered
    tooltipContainerStyle = {
      position: "absolute",
      top: windowHeight * 0.35,
      left: 16,
      right: 16,
    };
  }

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
            <Mask id="walkthroughSpotlightMask">
              {/* White background: dark backdrop visible */}
              <Rect
                fill="#ffffff"
                height={windowHeight}
                width={windowWidth}
                x="0"
                y="0"
              />
              {/* Black cutout: punches transparent hole */}
              {targetLayout && !isSimulated ? (
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
            mask="url(#walkthroughSpotlightMask)"
            width={windowWidth}
            x="0"
            y="0"
          />
        </Svg>

        {/* Target Focus Ring */}
        {targetLayout && !isSimulated ? (
          <View
            pointerEvents={isFabStep ? "auto" : "none"}
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
          >
            {isFabStep ? (
              <Pressable
                accessibilityLabel="Record new transaction"
                accessibilityRole="button"
                onPress={onFabPress}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </View>
        ) : null}

        {/* Simulated Display Mode Sheet (Step 4) */}
        {isSimulated ? (
          <View
            style={[
              styles.simulatedSheet,
              { paddingBottom: Math.max(20, insets.bottom + 12) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {t("dashboard.displayModeTitle")}
            </Text>

            <View style={[styles.sheetItem, styles.sheetItemActive]}>
              <View style={styles.sheetIconPill}>
                <Sparkles color={theme.colors.primary} size={18} />
              </View>
              <View style={styles.sheetItemTextGroup}>
                <Text style={styles.sheetItemLabel}>
                  {t("dashboard.displayModeSimple")}
                </Text>
                <Text style={styles.sheetItemDescription}>
                  {t("dashboard.displayModeSimpleDescription")}
                </Text>
              </View>
              <Check color={theme.colors.primary} size={18} />
            </View>

            <View style={styles.sheetItem}>
              <View style={styles.sheetIconPill}>
                <LayoutGrid color={theme.colors.textSecondary} size={18} />
              </View>
              <View style={styles.sheetItemTextGroup}>
                <Text style={styles.sheetItemLabel}>
                  {t("dashboard.displayModeDetailed")}
                </Text>
                <Text style={styles.sheetItemDescription}>
                  {t("dashboard.displayModeDetailedDescription")}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Tooltip Card */}
        <View style={tooltipContainerStyle}>
          <View style={styles.card}>
            {/* Card Top Row: Step Badge & Skip Button */}
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
                <X color={theme.colors.textMuted} size={16} />
              </Pressable>
            </View>

            {/* Title & Description */}
            <Text style={styles.cardTitle}>{t(step.titleKey as never)}</Text>
            <Text style={styles.cardDesc}>{t(step.descKey as never)}</Text>

            {/* Action Row */}
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
                  stepIndex === totalSteps - 1
                    ? "Finish Walkthrough"
                    : t("dashboard.walkthroughNext")
                }
                accessibilityRole="button"
                onPress={onNext}
                style={({ pressed }) => [
                  styles.nextBtn,
                  pressed && styles.nextBtnPressed,
                ]}
              >
                <Text style={styles.nextBtnText}>
                  {stepIndex === totalSteps - 1
                    ? "Finish"
                    : t("dashboard.walkthroughNext")}
                </Text>
                {stepIndex === totalSteps - 1 ? null : (
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
    overlayContainer: {
      flex: 1,
    },
    focusRing: {
      borderColor: "#00A3FF",
      borderWidth: 2,
      position: "absolute",
      backgroundColor: "transparent",
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1.5,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      ...theme.shadows.modal,
      elevation: 12,
    },
    cardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    stepBadge: {
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
    },
    stepBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    skipIconBtn: {
      padding: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    cardDesc: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm * 1.15,
    },
    cardActions: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.xs,
    },
    backBtn: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2,
      minHeight: 38,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    backBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    nextBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 4,
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    nextBtnPressed: {
      opacity: 0.85,
    },
    nextBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    simulatedSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.large * 1.5,
      borderTopRightRadius: theme.borderRadius.large * 1.5,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      bottom: 0,
      gap: theme.spacing.sm,
      left: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      position: "absolute",
      right: 0,
      ...theme.shadows.modal,
      elevation: 20,
    },
    sheetHandle: {
      alignSelf: "center",
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      height: 4,
      marginBottom: theme.spacing.xs,
      width: 36,
    },
    sheetTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.xs,
    },
    sheetItem: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    sheetItemActive: {
      backgroundColor: `${theme.colors.primary}0D`,
      borderColor: theme.colors.primary,
    },
    sheetIconPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    sheetItemTextGroup: {
      flex: 1,
      gap: 2,
    },
    sheetItemLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    sheetItemDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs * 1.15,
    },
  });
}
