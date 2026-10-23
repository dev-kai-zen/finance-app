import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { LayoutRect, WalkthroughStep } from "../types/walkthrough.types";

export interface TransactionFormWalkthroughOverlayProps {
  visible: boolean;
  step: WalkthroughStep | undefined;
  stepIndex: number;
  totalSteps: number;
  targetLayout: LayoutRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const SPOTLIGHT_PADDING = 4;
const SPOTLIGHT_RADIUS = 12;
const CARD_MARGIN = 16;
const CARD_ESTIMATED_HEIGHT = 180;

export function TransactionFormWalkthroughOverlay({
  visible,
  step,
  stepIndex,
  totalSteps,
  targetLayout,
  onNext,
  onPrev,
  onSkip,
}: TransactionFormWalkthroughOverlayProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  if (!visible || !step) return null;

  const title = t(step.titleKey as any);
  const desc = t(step.descKey as any);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  const targetX = targetLayout?.x ?? screenWidth / 2;
  const targetY = targetLayout?.y ?? screenHeight / 2;
  const targetW = targetLayout?.width ?? 0;
  const targetH = targetLayout?.height ?? 0;

  const spotlightLeft = Math.max(0, targetX - SPOTLIGHT_PADDING);
  const spotlightTop = Math.max(0, targetY - SPOTLIGHT_PADDING);
  const spotlightRight = Math.min(
    screenWidth,
    targetX + targetW + SPOTLIGHT_PADDING,
  );
  const spotlightBottom = Math.min(
    screenHeight,
    targetY + targetH + SPOTLIGHT_PADDING,
  );
  const spotlightWidth = spotlightRight - spotlightLeft;
  const spotlightHeight = spotlightBottom - spotlightTop;

  // Decide if card sits below or above target
  const spaceBelow = screenHeight - spotlightBottom;
  const placeAbove =
    spaceBelow < CARD_ESTIMATED_HEIGHT + 24 &&
    spotlightTop > CARD_ESTIMATED_HEIGHT + 24;

  const cardTop = placeAbove
    ? Math.max(16, spotlightTop - CARD_ESTIMATED_HEIGHT - 12)
    : Math.min(screenHeight - CARD_ESTIMATED_HEIGHT - 16, spotlightBottom + 12);

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onSkip}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View pointerEvents="box-none" style={styles.container}>
        {/* Semi-transparent 4-sided mask */}
        {targetLayout ? (
          <>
            {/* Top slice */}
            <View
              style={[
                styles.maskSlice,
                {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: spotlightTop,
                },
              ]}
            />
            {/* Bottom slice */}
            <View
              style={[
                styles.maskSlice,
                {
                  top: spotlightBottom,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            {/* Left slice */}
            <View
              style={[
                styles.maskSlice,
                {
                  top: spotlightTop,
                  left: 0,
                  width: spotlightLeft,
                  height: spotlightHeight,
                },
              ]}
            />
            {/* Right slice */}
            <View
              style={[
                styles.maskSlice,
                {
                  top: spotlightTop,
                  left: spotlightRight,
                  right: 0,
                  height: spotlightHeight,
                },
              ]}
            />

            {/* Glowing Focus Ring */}
            <View
              pointerEvents="none"
              style={[
                styles.focusRing,
                {
                  top: spotlightTop,
                  left: spotlightLeft,
                  width: spotlightWidth,
                  height: spotlightHeight,
                  borderRadius: SPOTLIGHT_RADIUS,
                },
              ]}
            />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.maskSlice]} />
        )}

        {/* Walkthrough Tooltip Card */}
        <View
          style={[
            styles.card,
            {
              top: cardTop,
              left: CARD_MARGIN,
              right: CARD_MARGIN,
            },
          ]}
        >
          {/* Header Row: Step counter & Skip */}
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                Step {stepIndex + 1} of {totalSteps}
              </Text>
            </View>

            <Pressable
              accessibilityLabel={t("dashboard.walkthroughSkip")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onSkip}
              style={({ pressed }) => [
                styles.skipBtn,
                pressed && styles.skipBtnPressed,
              ]}
            >
              <Text style={styles.skipBtnText}>
                {t("dashboard.walkthroughSkip")}
              </Text>
            </Pressable>
          </View>

          {/* Title & Description */}
          <View style={styles.cardContent}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{desc}</Text>
          </View>

          {/* Footer Controls: Back & Next / Finish */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              {!isFirstStep ? (
                <Pressable
                  accessibilityLabel={t("dashboard.walkthroughBack")}
                  accessibilityRole="button"
                  onPress={onPrev}
                  style={({ pressed }) => [
                    styles.backBtn,
                    pressed && styles.backBtnPressed,
                  ]}
                >
                  <ChevronLeft color={theme.colors.textSecondary} size={16} />
                  <Text style={styles.backBtnText}>
                    {t("dashboard.walkthroughBack")}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.footerRight}>
              <Pressable
                accessibilityLabel={
                  isLastStep ? "Finish" : t("dashboard.walkthroughNext")
                }
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
                {isLastStep ? null : (
                  <ChevronRight color={theme.colors.textPrimary} size={16} />
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
    container: {
      ...StyleSheet.absoluteFill,
      zIndex: 9999,
    },
    maskSlice: {
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      position: "absolute",
    },
    focusRing: {
      borderColor: "#00A3FF",
      borderWidth: 2,
      position: "absolute",
      backgroundColor: "transparent",
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      elevation: 8,
      padding: 16,
      position: "absolute",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    cardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    stepBadge: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}33`,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    stepBadgeText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "700",
    },
    skipBtn: {
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    skipBtnPressed: {
      opacity: 0.6,
    },
    skipBtnText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "500",
    },
    cardContent: {
      marginBottom: 16,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 6,
    },
    description: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    cardFooter: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    footerLeft: {
      flexDirection: "row",
    },
    footerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    backBtn: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    backBtnPressed: {
      opacity: 0.7,
    },
    backBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    nextBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    nextBtnPressed: {
      opacity: 0.85,
    },
    nextBtnText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
  });
}
