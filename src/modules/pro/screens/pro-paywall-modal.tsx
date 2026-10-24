import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crown, Flame, ShieldCheck, Sparkles, X } from "lucide-react-native";
import { BlurView } from "expo-blur";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

import { ProCardsCarousel } from "../components/pro-cards-carousel";
import { PRO_CONSTANTS } from "../constants/pro.constants";
import { useProStatus } from "../hooks/use-pro-status";

export interface ProPaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProPaywallModal({ visible, onClose }: ProPaywallModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

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

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={45}
          tint={theme.mode === "dark" ? "dark" : "default"}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          accessibilityLabel={t("common.close")}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.badgeRow}>
                <View style={styles.crownContainer}>
                  <Crown color="#D97706" size={14} />
                </View>
                <Text style={styles.badgeText}>
                  {t("pro.paywallLifetimeBadge")}
                </Text>
              </View>
              <Text accessibilityRole="header" style={styles.title}>
                {t("pro.paywallTitle")}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("common.close")}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X color={theme.colors.textSecondary} size={22} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Value Proposition Hero / Feature Lead-In */}
            <View style={styles.heroBanner}>
              <Sparkles color="#D97706" size={18} />
              <Text style={styles.heroTitle}>
                {t("pro.featuresLeadIn")}
              </Text>
            </View>

            {/* Feature Cards Carousel (Swipe Left/Right) */}
            <ProCardsCarousel />

            {/* Launching Price & Conversion Card */}
            <View style={styles.launchCard}>
              {/* Top Urgency Ribbon */}
              <View style={styles.launchRibbon}>
                <View style={styles.launchRibbonLeft}>
                  <Flame color="#F59E0B" size={16} />
                  <Text style={styles.launchRibbonTitle}>
                    {t("pro.launchSpecialBadge")}
                  </Text>
                </View>
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>
                    {t("pro.launchDiscountBadge")}
                  </Text>
                </View>
              </View>

              {/* Price comparison row */}
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

              <Text style={styles.launchSubtext}>
                {t("pro.launchSubtext")}
              </Text>

              {/* Primary Action Button */}
              {isPro ? (
                <View style={styles.proActiveNotice}>
                  <ShieldCheck color={theme.colors.success} size={22} />
                  <Text style={styles.proActiveText}>
                    {t("pro.proActive")}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isPurchasing}
                  onPress={handlePurchase}
                  style={({ pressed }) => [
                    styles.purchaseButton,
                    pressed && styles.purchaseButtonPressed,
                    isPurchasing && styles.purchaseButtonDisabled,
                  ]}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <>
                      <Crown color="#000000" size={18} />
                      <Text style={styles.purchaseButtonText}>
                        {t("pro.launchUpgradeBtn", { price: priceText })}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* Guarantees */}
              <Text style={styles.guaranteeText}>
                {t("pro.guaranteeText")}
              </Text>
            </View>

            {/* Restore Purchases */}
            <Pressable
              accessibilityRole="button"
              disabled={isRestoring}
              onPress={handleRestore}
              style={styles.restoreBtn}
            >
              {isRestoring ? (
                <ActivityIndicator color={theme.colors.textSecondary} size="small" />
              ) : (
                <Text style={styles.restoreText}>
                  {t("pro.restorePurchases")}
                </Text>
              )}
            </Pressable>

            {/* Disclaimer */}
            <Text style={styles.disclaimerText}>
              {t("pro.disclaimer")}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.35)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      flex: 1,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      maxHeight: "92%",
      minHeight: 520,
    },
    header: {
      alignItems: "flex-start",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerCopy: {
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    crownContainer: {
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      padding: 4,
      borderRadius: theme.borderRadius.round,
    },
    badgeText: {
      color: "#D97706",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.2,
    },
    closeBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      marginTop: 2,
      width: 36,
    },
    scrollContent: {
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    heroBanner: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(217, 119, 6, 0.25)",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    heroTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
      lineHeight: 18,
      flexShrink: 1,
    },
    launchCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      borderWidth: 1.5,
      borderColor: "#F59E0B",
      gap: 8,
    },
    launchRibbon: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    launchRibbonLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    launchRibbonTitle: {
      color: "#F59E0B",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    discountPill: {
      backgroundColor: "rgba(245, 158, 11, 0.18)",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      borderColor: "rgba(245, 158, 11, 0.4)",
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
      fontSize: theme.typography.fontSize.sm,
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
      fontSize: 26,
      fontWeight: theme.typography.fontWeight.bold,
    },
    savingsPill: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.35)",
    },
    savingsPillText: {
      color: "#10B981",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    launchSubtext: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    purchaseButton: {
      backgroundColor: "#F59E0B",
      borderRadius: theme.borderRadius.medium,
      paddingVertical: 13,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 2,
    },
    purchaseButtonPressed: {
      opacity: 0.88,
    },
    purchaseButtonDisabled: {
      opacity: 0.6,
    },
    purchaseButtonText: {
      color: "#000000",
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    proActiveNotice: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 8,
    },
    proActiveText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    guaranteeText: {
      color: theme.colors.textMuted,
      fontSize: 10,
      textAlign: "center",
      marginTop: 2,
    },
    restoreBtn: {
      alignItems: "center",
      paddingVertical: 4,
    },
    restoreText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      textDecorationLine: "underline",
    },
    disclaimerText: {
      color: theme.colors.textMuted,
      fontSize: 10,
      textAlign: "center",
      lineHeight: 14,
      paddingHorizontal: theme.spacing.xl,
    },
  });
}
