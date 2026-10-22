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
  Landmark,
  Sparkles,
  Users,
  X,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";

export interface AccountsWalkthroughOverlayProps {
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

export function AccountsWalkthroughOverlay({
  visible,
  stepIndex,
  totalSteps,
  step,
  targetLayout,
  onNext,
  onPrev,
  onSkip,
  onFabPress,
}: AccountsWalkthroughOverlayProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { t } = useLocalization();

  if (!visible || !step) return null;

  const isSimulated = !!step.isSimulatedModal;
  const isFabStep = step.id === "accountsFab";

  // Calculate cutout sizing
  let cutoutPadding = 4;
  let cutoutRadius = 14;

  if (step.id === "archivedChip" || step.id === "fundGroupsChip") {
    cutoutPadding = 5;
    cutoutRadius = 20;
  } else if (step.id === "searchBox") {
    cutoutPadding = 4;
    cutoutRadius = 12;
  } else if (isFabStep) {
    cutoutPadding = 6;
    cutoutRadius = 34;
  } else if (step.id === "assetsSection" || step.id === "liabilitiesSection") {
    cutoutPadding = 6;
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

  // Tooltip position calculation (strictly outside highlighted target)
  let tooltipContainerStyle: ViewStyle;

  if (isSimulated) {
    // Above simulated bottom sheet
    tooltipContainerStyle = {
      position: "absolute",
      bottom: Math.max(280, insets.bottom + 250),
      left: 16,
      right: 16,
    };
  } else if (targetLayout) {
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
            <Mask id="accountsSpotlightMask">
              {/* Solid White Base = fully visible dark overlay */}
              <Rect
                x="0"
                y="0"
                width={windowWidth}
                height={windowHeight}
                fill="#FFFFFF"
              />
              {/* Black Cutout = pure transparent hole */}
              {targetLayout && !isSimulated ? (
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

          {/* Dark Backdrop with Cutout Applied */}
          <Rect
            x="0"
            y="0"
            width={windowWidth}
            height={windowHeight}
            fill="#000000B3"
            mask="url(#accountsSpotlightMask)"
          />
        </Svg>

        {/* Interactive touch forwarder on highlighted FAB */}
        {targetLayout && isFabStep && onFabPress ? (
          <Pressable
            accessibilityLabel="Tap accounts menu"
            accessibilityRole="button"
            onPress={onFabPress}
            style={{
              position: "absolute",
              left: cutoutX,
              top: cutoutY,
              width: cutoutW,
              height: cutoutH,
              borderRadius: cutoutRadius,
            }}
          />
        ) : null}

        {/* Simulated Accounts Bottom Sheet (Step 7) */}
        {isSimulated ? (
          <View
            style={[
              styles.simulatedSheet,
              { paddingBottom: Math.max(24, insets.bottom + 12) },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t("accountsWalkthrough.stepSheetTitle")}
              </Text>
            </View>

            {/* Simulated Item 1: Add New Account */}
            <View style={styles.sheetItem}>
              <View style={styles.sheetIconPill}>
                <Landmark color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.sheetItemTextGroup}>
                <Text style={styles.sheetItemLabel}>
                  {t("accountsWalkthrough.actionAddAccount")}
                </Text>
                <Text style={styles.sheetItemDescription}>
                  {t("accountsWalkthrough.actionAddAccountDesc")}
                </Text>
              </View>
            </View>

            {/* Simulated Item 2: Account Group Setup */}
            <View style={styles.sheetItem}>
              <View style={styles.sheetIconPill}>
                <Users color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.sheetItemTextGroup}>
                <Text style={styles.sheetItemLabel}>
                  {t("accountsWalkthrough.actionManageTypes")}
                </Text>
                <Text style={styles.sheetItemDescription}>
                  {t("accountsWalkthrough.actionManageTypesDesc")}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Tooltip Card */}
        <View style={tooltipContainerStyle}>
          <View style={styles.card}>
            {/* Card Header: Step Badge & Skip Button */}
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
                {stepIndex === totalSteps - 1 ? (
                  <Sparkles color="#FFFFFF" size={15} />
                ) : (
                  <ChevronRight color="#FFFFFF" size={15} />
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
      marginBottom: 2,
    },
    stepBadge: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
    },
    stepBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.3,
    },
    skipIconBtn: {
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.2,
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
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    backBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    nextBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    nextBtnPressed: {
      opacity: 0.85,
    },
    nextBtnText: {
      color: "#FFFFFF",
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    simulatedSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      bottom: 0,
      gap: theme.spacing.md,
      left: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      position: "absolute",
      right: 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 20,
    },
    sheetHandle: {
      alignSelf: "center",
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      height: 4,
      marginBottom: theme.spacing.xs,
      width: 40,
    },
    sheetHeader: {
      paddingBottom: 2,
    },
    sheetTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    sheetItem: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    sheetIconPill: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.round,
      height: 40,
      justifyContent: "center",
      width: 40,
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
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs * 1.1,
    },
  });
}
