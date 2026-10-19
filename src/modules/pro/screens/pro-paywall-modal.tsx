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
import { Sparkles, X, Check, ShieldCheck, Crown } from "lucide-react-native";

import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

import { PRO_FEATURES } from "../constants/pro.constants";
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

  const priceText = offering?.priceString || "$9.99";

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
        <Pressable
          accessibilityLabel={t("common.close")}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) },
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
            {/* Value Proposition Hero */}
            <View style={styles.heroBanner}>
              <Sparkles color="#D97706" size={28} />
              <Text style={styles.heroTitle}>
                {t("pro.paywallSubtitle")}
              </Text>
            </View>

            {/* Feature List */}
            <View style={styles.featureList}>
              {PRO_FEATURES.map((feature, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <IconHelper
                      color={theme.colors.primary}
                      name={feature.icon}
                      size={20}
                    />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>
                      {feature.defaultTitle}
                    </Text>
                    <Text style={styles.featureDesc}>
                      {feature.defaultDesc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* CTA Section */}
            <View style={styles.ctaCard}>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>{t("pro.lifetime")}</Text>
                  <Text style={styles.priceSubLabel}>{t("pro.oneTimeOffer")}</Text>
                </View>
                <Text style={styles.priceAmount}>{priceText}</Text>
              </View>

              {isPro ? (
                <View style={styles.proActiveNotice}>
                  <ShieldCheck color={theme.colors.success} size={20} />
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
                        {t("pro.paywallUpgradeBtn", { price: priceText })}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
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
      backgroundColor: "rgba(0, 0, 0, 0.55)",
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
      maxHeight: "90%",
      minHeight: 520,
    },
    header: {
      alignItems: "flex-start",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    headerCopy: {
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
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
      fontSize: theme.typography.fontSize.xl,
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
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    heroBanner: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.lg,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(217, 119, 6, 0.2)",
      gap: 8,
    },
    heroTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "center",
      lineHeight: 20,
    },
    featureList: {
      gap: theme.spacing.md,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
    },
    featureIconContainer: {
      width: 38,
      height: 38,
      borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    featureTextContainer: {
      flex: 1,
      minWidth: 0,
    },
    featureTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: 2,
    },
    featureDesc: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 18,
    },
    ctaCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.lg,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      gap: theme.spacing.md,
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    priceLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    priceSubLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    priceAmount: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
    },
    purchaseButton: {
      backgroundColor: theme.colors.warning,
      borderRadius: theme.borderRadius.medium,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    purchaseButtonPressed: {
      opacity: 0.85,
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
      paddingVertical: 10,
    },
    proActiveText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    restoreBtn: {
      alignItems: "center",
      paddingVertical: 8,
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
    },
  });
}
