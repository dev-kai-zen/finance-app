import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Crown, Flame, Sparkles, Check, Lock } from "lucide-react-native";
import { BlurView } from "expo-blur";

import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

import { PRO_CONSTANTS } from "../constants/pro.constants";
import { useProStatus } from "../hooks/use-pro-status";
import { ProPaywallModal } from "../screens/pro-paywall-modal";

export interface ProGateProps {
  children: React.ReactNode;
  featureTitle?: string;
  featureDescription?: string;
  benefits?: Array<{ icon: string; text: string }>;
  mode?: "card" | "blur";
}

export function ProGate({
  children,
  featureTitle,
  featureDescription,
  benefits,
  mode = "card",
}: ProGateProps) {
  const styles = useThemeStyles(createStyles);
  const theme = useAppTheme();
  const { t } = useLocalization();
  const { isPro, isLoading, isRestoring, offering, restorePurchases } = useProStatus();
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} size="small" />
      </View>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  const defaultBenefits = [
    { icon: "file-text", text: "Cash Flow & Inflow/Outflow trends" },
    { icon: "pie-chart", text: "Balance Sheet & account variance" },
    { icon: "target", text: "Net worth growth tracking over time" },
    { icon: "shield-check", text: "100% ad-free lifetime experience" },
  ];

  const displayBenefits = benefits ?? defaultBenefits;
  const priceText = offering?.priceString || PRO_CONSTANTS.FALLBACK_PRICE;

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result.success && result.restored) {
      Alert.alert(
        t("pro.restoreSuccessTitle"),
        t("pro.restoreSuccessMsg"),
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

  const renderLaunchDealBox = () => (
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
  );

  if (mode === "blur") {
    return (
      <View style={styles.blurWrapper}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.blurredContent}
        >
          {children}
        </View>

        <BlurView
          intensity={90}
          tint={theme.mode === "dark" ? "dark" : "light"}
          style={styles.blurOverlay}
        >
          <View style={styles.compactGateCard}>
            <View style={styles.compactHeroIconWrapper}>
              <Crown color="#D97706" size={26} />
              <View style={styles.compactLockBadge}>
                <Lock color="#FFFFFF" size={10} strokeWidth={2.5} />
              </View>
            </View>

            <Text style={styles.compactGateTitle}>
              {featureTitle ?? t("pro.reportsLockedTitle")}
            </Text>

            {featureDescription ? (
              <View style={styles.featureInfoCard}>
                <Text style={styles.featureInfoText}>
                  {featureDescription}
                </Text>
              </View>
            ) : null}

            {renderLaunchDealBox()}

            <Pressable
              accessibilityRole="button"
              onPress={() => setPaywallOpen(true)}
              style={({ pressed }) => [
                styles.upgradeButton,
                pressed && styles.upgradeButtonPressed,
              ]}
            >
              <Crown color="#000000" size={17} />
              <Text style={styles.upgradeButtonText}>
                {t("pro.featureModalUpgradeBtn", { price: priceText })}
              </Text>
            </Pressable>

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

            <Pressable
              accessibilityRole="button"
              disabled={isRestoring}
              onPress={handleRestore}
              style={styles.restoreBtn}
            >
              {isRestoring ? (
                <ActivityIndicator color={theme.colors.textSecondary} size="small" />
              ) : (
                <Text style={styles.restoreBtnText}>
                  {t("pro.restorePurchases")}
                </Text>
              )}
            </Pressable>
          </View>
        </BlurView>

        <ProPaywallModal
          onClose={() => setPaywallOpen(false)}
          visible={paywallOpen}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.gateScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.gateCard}>
        {/* Crown Badge */}
        <View style={styles.heroIconWrapper}>
          <Crown color="#D97706" size={32} />
          <View style={styles.lockBadge}>
            <Lock color="#FFFFFF" size={11} strokeWidth={2.5} />
          </View>
        </View>

        <Text style={styles.gateTitle}>
          {featureTitle ?? t("pro.reportsLockedTitle")}
        </Text>

        {featureDescription ? (
          <View style={styles.featureInfoCard}>
            <Text style={styles.featureInfoText}>
              {featureDescription}
            </Text>
          </View>
        ) : null}

        {displayBenefits && displayBenefits.length > 0 ? (
          <View style={styles.benefitsList}>
            {displayBenefits.map((item, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <View style={styles.benefitIconWrapper}>
                  <Check color={theme.colors.primary} size={14} />
                </View>
                <Text style={styles.benefitText}>{item.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {renderLaunchDealBox()}

        {/* Upgrade Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setPaywallOpen(true)}
          style={({ pressed }) => [
            styles.upgradeButton,
            pressed && styles.upgradeButtonPressed,
          ]}
        >
          <Crown color="#000000" size={18} />
          <Text style={styles.upgradeButtonText}>
            {t("pro.featureModalUpgradeBtn", { price: priceText })}
          </Text>
        </Pressable>

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
            <ActivityIndicator color={theme.colors.textSecondary} size="small" />
          ) : (
            <Text style={styles.restoreBtnText}>
              {t("pro.restorePurchases")}
            </Text>
          )}
        </Pressable>

        <Text style={styles.disclaimerText}>
          {t("pro.disclaimer")}
        </Text>
      </View>

      <ProPaywallModal
        onClose={() => setPaywallOpen(false)}
        visible={paywallOpen}
      />
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 200,
    },
    gateScroll: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    gateCard: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.xl,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "rgba(217, 119, 6, 0.4)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 6,
    },
    heroIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: theme.borderRadius.round,
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      position: "relative",
    },
    lockBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: theme.mode === "dark" ? "#27272A" : "#18181B",
      borderWidth: 2,
      borderColor: theme.colors.surface,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    gateTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    benefitsList: {
      width: "100%",
      gap: theme.spacing.sm,
      marginVertical: theme.spacing.md,
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    benefitIconWrapper: {
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    benefitText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      flex: 1,
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
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.xl,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      gap: 8,
      marginBottom: 6,
    },
    upgradeButtonPressed: {
      opacity: 0.88,
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
      paddingVertical: 6,
      marginBottom: theme.spacing.xs,
    },
    restoreBtnText: {
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
      marginTop: 4,
    },
    blurWrapper: {
      position: "relative",
      width: "100%",
      minHeight: 400,
    },
    blurredContent: {
      opacity: 0.65,
      transform: [{ scale: 0.99 }],
    },
    blurOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor:
        theme.mode === "dark"
          ? "rgba(13, 15, 14, 0.45)"
          : "rgba(255, 255, 255, 0.50)",
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
  });
}
