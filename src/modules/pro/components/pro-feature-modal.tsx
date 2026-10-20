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
import { Crown, Lock, Sparkles, X } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useProStatus } from "../hooks/use-pro-status";

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

  const {
    isPro,
    isPurchasing,
    isRestoring,
    offering,
    purchaseLifetime,
    restorePurchases,
  } = useProStatus();

  const priceText = offering?.priceString || "$9.99";

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

          {/* Descriptive Information Card */}
          <View style={styles.featureInfoCard}>
            <Text style={styles.featureInfoText}>{description}</Text>
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
                <Sparkles color="#000000" size={16} />
                <Text style={styles.upgradeButtonText}>
                  {t("pro.paywallUpgradeBtn", { price: priceText })}
                </Text>
              </>
            )}
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
      padding: theme.spacing.xl,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "rgba(217, 119, 6, 0.4)",
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
      paddingHorizontal: theme.spacing.md,
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
    upgradeButtonDisabled: {
      opacity: 0.65,
    },
    upgradeButtonText: {
      color: "#000000",
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    restoreBtn: {
      paddingVertical: 8,
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
