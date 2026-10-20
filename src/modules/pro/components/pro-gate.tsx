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
import { Crown, Sparkles, Check, Lock } from "lucide-react-native";
import { BlurView } from "expo-blur";

import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

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
  const priceText = offering?.priceString || "$9.99";

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
          intensity={75}
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

            <Pressable
              accessibilityRole="button"
              onPress={() => setPaywallOpen(true)}
              style={({ pressed }) => [
                styles.upgradeButton,
                pressed && styles.upgradeButtonPressed,
              ]}
            >
              <Sparkles color="#000000" size={16} />
              <Text style={styles.upgradeButtonText}>
                {t("pro.paywallUpgradeBtn", { price: priceText })}
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

        {benefits ? (
          <View style={styles.benefitsList}>
            {benefits.map((item, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <View style={styles.benefitIconWrapper}>
                  <Check color={theme.colors.primary} size={14} />
                </View>
                <Text style={styles.benefitText}>{item.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Upgrade Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setPaywallOpen(true)}
          style={({ pressed }) => [
            styles.upgradeButton,
            pressed && styles.upgradeButtonPressed,
          ]}
        >
          <Sparkles color="#000000" size={18} />
          <Text style={styles.upgradeButtonText}>
            {t("pro.paywallUpgradeBtn", { price: priceText })}
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
      padding: theme.spacing.xl,
      justifyContent: "center",
    },
    gateCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.xl,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "rgba(217, 119, 6, 0.3)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    heroIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: theme.borderRadius.round,
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.lg,
      position: "relative",
    },
    lockBadge: {
      position: "absolute",
      bottom: -1,
      right: -1,
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
      marginBottom: theme.spacing.xs,
    },
    gateSubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: theme.spacing.xl,
    },
    benefitsList: {
      width: "100%",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceMuted,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.large,
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    benefitIconWrapper: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    benefitText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
    },
    upgradeButton: {
      backgroundColor: theme.colors.warning,
      borderRadius: theme.borderRadius.medium,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.xl,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      gap: 8,
      marginBottom: theme.spacing.md,
    },
    upgradeButtonPressed: {
      opacity: 0.85,
    },
    upgradeButtonText: {
      color: "#000000",
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    restoreBtn: {
      paddingVertical: 8,
      marginBottom: theme.spacing.sm,
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
      padding: theme.spacing.xl,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "rgba(217, 119, 6, 0.4)",
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
      marginBottom: theme.spacing.md,
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
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    featureInfoCard: {
      width: "100%",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    featureInfoText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs + 1,
      lineHeight: 19,
      textAlign: "center",
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
}
