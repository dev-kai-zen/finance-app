import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Crown, Flame, Lock, X } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

import { PRO_CONSTANTS } from "../constants/pro.constants";
import { useProStatus } from "../hooks/use-pro-status";
import { ProPaywallModal } from "../screens/pro-paywall-modal";

export interface ProFeatureModalProps {
  visible: boolean;
  onClose: () => void;
  featureTitle?: string;
  featureDescription?: string;
}

export function ProFeatureModal({
  visible,
  onClose,
  featureTitle,
  featureDescription,
}: ProFeatureModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const {
    isPro,
    isPurchasing,
    isRestoring,
    offering,
    purchaseLifetime,
    restorePurchases,
  } = useProStatus();

  const priceText = offering?.priceString || PRO_CONSTANTS.FALLBACK_PRICE;

  const handlePurchase = async () => {
    if (isPro) {
      Alert.alert(t("pro.proActive"), t("pro.allFeaturesUnlocked"));
      onClose();
      return;
    }

    const result = await purchaseLifetime();
    if (result.success && result.isPro) {
      Alert.alert(
        t("pro.purchaseSuccessTitle"),
        t("pro.purchaseSuccessMsg"),
        [{ text: t("common.ok"), onPress: onClose }],
      );
    } else if (!result.success && !result.userCancelled && result.error) {
      Alert.alert(t("pro.restoreErrorTitle"), result.error);
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result.success && result.restored) {
      Alert.alert(
        t("pro.restoreSuccessTitle"),
        t("pro.restoreSuccessMsg"),
        [{ text: t("common.ok"), onPress: onClose }],
      );
    } else if (result.success && !result.restored) {
      Alert.alert(
        t("pro.restoreNotFoundTitle"),
        t("pro.restoreNotFoundMsg"),
      );
    } else if (!result.success && result.error) {
      Alert.alert(t("pro.restoreErrorTitle"), result.error);
    }
  };

  const title = featureTitle ?? t("pro.reportsLockedTitle");
  const description =
    featureDescription ??
    "Unlock all advanced tools, unlimited entities, and an ad-free experience forever with a one-time purchase.";

  return (
    <>
      <Modal
        animationType="fade"
        onRequestClose={onClose}
        transparent
        visible={visible}
      >
        <View style={styles.overlay}>
          <BlurView
            intensity={90}
            tint={theme.mode === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            accessibilityLabel={t("common.close")}
            onPress={onClose}
            style={styles.backdrop}
          />

          <View style={styles.compactGateCard}>
            {/* Top Close Button */}
            <Pressable
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X color={theme.colors.textSecondary} size={20} />
            </Pressable>

            {/* Hero Icon with Lock Badge */}
            <View style={styles.compactHeroIconWrapper}>
              <Crown color="#D97706" size={26} />
              <View style={styles.compactLockBadge}>
                <Lock color="#FFFFFF" size={10} strokeWidth={2.5} />
              </View>
            </View>

            {/* Title */}
            <Text accessibilityRole="header" style={styles.compactGateTitle}>
              {title}
            </Text>

            {/* Descriptive Information Card (Positive Reinforcement) */}
            <View style={styles.featureInfoCard}>
              <Text style={styles.featureInfoText}>{description}</Text>
            </View>

            {/* Launch Deal Promo Box */}
            <View style={styles.launchDealBox}>
              <View style={styles.launchDealHeader}>
                <View style={styles.launchDealHeaderLeft}>
                  <Flame color="#F59E0B" size={14} />
                  <Text style={styles.launchDealBadge}>
                    {t("pro.launchSpecialBadge")}
                  </Text>
                </View>
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>
                    {t("pro.launchDiscountBadge")}
                  </Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <View style={styles.priceLeft}>
                  <View style={styles.strikeWrapper}>
                    <Text style={styles.strikePrice}>
                      {t("pro.launchRegularPrice")}
                    </Text>
                    <View style={styles.strikeLine} />
                  </View>
                  <Text style={styles.promoPrice}>{priceText}</Text>
                </View>

                <View style={styles.savingsPill}>
                  <Text style={styles.savingsPillText}>
                    {t("pro.launchSavingsText")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Upgrade Button */}
            <Pressable
              accessibilityRole="button"
              disabled={isPurchasing}
              onPress={handlePurchase}
              style={({ pressed }) => [
                styles.upgradeButton,
                pressed && styles.upgradeButtonPressed,
                isPurchasing && styles.upgradeButtonDisabled,
              ]}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <>
                  <Crown color="#000000" size={17} />
                  <Text style={styles.upgradeButtonText}>
                    {t("pro.featureModalUpgradeBtn", { price: priceText })}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Explore All Features Link */}
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setPaywallOpen(true)}
              style={styles.exploreLink}
            >
              <Text style={styles.exploreLinkText}>
                {t("pro.exploreAllFeatures")}
              </Text>
            </Pressable>

            {/* Restore Purchases Button */}
            <Pressable
              accessibilityRole="button"
              disabled={isRestoring}
              onPress={handleRestore}
              style={styles.restoreBtn}
            >
              {isRestoring ? (
                <ActivityIndicator
                  color={theme.colors.textSecondary}
                  size="small"
                />
              ) : (
                <Text style={styles.restoreBtnText}>
                  {t("pro.restorePurchases")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Full Carousel Paywall Modal */}
      <ProPaywallModal
        onClose={() => setPaywallOpen(false)}
        visible={paywallOpen}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor:
        theme.mode === "dark"
          ? "rgba(13, 15, 14, 0.45)"
          : "rgba(255, 255, 255, 0.40)",
    },
    compactGateCard: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.lg,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "rgba(217, 119, 6, 0.45)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 8,
      position: "relative",
    },
    closeBtn: {
      position: "absolute",
      top: 14,
      right: 14,
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.surfaceMuted,
      zIndex: 10,
    },
    compactHeroIconWrapper: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.round,
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
      position: "relative",
    },
    compactLockBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: theme.mode === "dark" ? "#27272A" : "#18181B",
      borderWidth: 2,
      borderColor: theme.colors.surface,
      width: 19,
      height: 19,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    compactGateTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md + 1,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    featureInfoCard: {
      width: "100%",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    featureInfoText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 18,
      textAlign: "center",
      fontWeight: theme.typography.fontWeight.medium,
    },
    launchDealBox: {
      width: "100%",
      backgroundColor:
        theme.mode === "dark"
          ? "rgba(245, 158, 11, 0.08)"
          : "rgba(245, 158, 11, 0.06)",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: "rgba(245, 158, 11, 0.35)",
      padding: theme.spacing.sm + 2,
      marginBottom: theme.spacing.md,
      gap: 4,
    },
    launchDealHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    launchDealHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    launchDealBadge: {
      color: "#F59E0B",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.6,
    },
    discountPill: {
      backgroundColor: "rgba(245, 158, 11, 0.22)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.round,
    },
    discountPillText: {
      color: "#D97706",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 2,
    },
    priceLeft: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },
    strikeWrapper: {
      position: "relative",
      justifyContent: "center",
    },
    strikePrice: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    strikeLine: {
      position: "absolute",
      height: 1.5,
      backgroundColor: "#EF4444",
      left: 0,
      right: 0,
    },
    promoPrice: {
      color: "#F59E0B",
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.bold,
    },
    savingsPill: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.3)",
    },
    savingsPillText: {
      color: "#10B981",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    upgradeButton: {
      backgroundColor: "#F59E0B",
      borderRadius: theme.borderRadius.medium,
      paddingVertical: 13,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      gap: 7,
      marginBottom: 6,
    },
    upgradeButtonPressed: {
      opacity: 0.88,
    },
    upgradeButtonDisabled: {
      opacity: 0.65,
    },
    upgradeButtonText: {
      color: "#000000",
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    exploreLink: {
      paddingVertical: 4,
      marginBottom: 2,
    },
    exploreLinkText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    restoreBtn: {
      paddingVertical: 4,
      marginBottom: theme.spacing.xs,
    },
    restoreBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      textDecorationLine: "underline",
    },
  });
}
