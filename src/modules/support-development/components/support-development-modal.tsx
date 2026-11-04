import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Crown,
  Heart,
  MessageSquare,
  Share2,
  Star,
} from "lucide-react-native";

import { AppButton } from "@/components/app-button";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { sendFeedback } from "@/utils/send-feedback";

import { openStoreReviewPage } from "../services/open-store-review.service";
import { shareApp } from "../services/share-app.service";

interface SupportDevelopmentModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenPro?: () => void;
  isPro?: boolean;
}

export function SupportDevelopmentModal({
  visible,
  onClose,
  onOpenPro,
  isPro = false,
}: SupportDevelopmentModalProps) {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const handleRate = async () => {
    await openStoreReviewPage();
  };

  const handleShare = async () => {
    await shareApp({
      title: "Kaizen Finance",
      message: t("supportDevelopment.shareMessage"),
    });
  };

  const handleFeedback = () => {
    void sendFeedback({
      subject: "Kaizen Finance - Suggestions & Feedback",
    });
  };

  const handlePro = () => {
    onClose();
    onOpenPro?.();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View
            style={[
              styles.card,
              isTabletOrDesktop(width) && styles.cardDesktop,
            ]}
          >
            {/* Header Icon & Title */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Heart
                  color={theme.colors.primary}
                  fill={`${theme.colors.primary}33`}
                  size={28}
                />
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t("supportDevelopment.badge")}
                </Text>
              </View>
              <Text style={styles.heading}>
                {t("supportDevelopment.title")}
              </Text>
              <Text style={styles.subheading}>
                {t("supportDevelopment.subtitle")}
              </Text>
            </View>

            {/* Action Cards */}
            <View style={styles.actionsList}>
              {/* 1. Rate on Google Play */}
              <Pressable
                accessibilityLabel={t("supportDevelopment.rateTitle")}
                accessibilityRole="button"
                onPress={handleRate}
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.actionCardPressed,
                ]}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#F59E0B20" },
                  ]}
                >
                  <Star color="#F59E0B" fill="#F59E0B" size={22} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>
                    {t("supportDevelopment.rateTitle")}
                  </Text>
                  <Text style={styles.actionSubtitle}>
                    {t("supportDevelopment.rateSubtitle")}
                  </Text>
                </View>
              </Pressable>

              {/* 2. Share with Friends */}
              <Pressable
                accessibilityLabel={t("supportDevelopment.shareTitle")}
                accessibilityRole="button"
                onPress={handleShare}
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.actionCardPressed,
                ]}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: `${theme.colors.accent}20` },
                  ]}
                >
                  <Share2 color={theme.colors.accent} size={22} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>
                    {t("supportDevelopment.shareTitle")}
                  </Text>
                  <Text style={styles.actionSubtitle}>
                    {t("supportDevelopment.shareSubtitle")}
                  </Text>
                </View>
              </Pressable>

              {/* 3. Send Feedback */}
              <Pressable
                accessibilityLabel={t("supportDevelopment.feedbackTitle")}
                accessibilityRole="button"
                onPress={handleFeedback}
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.actionCardPressed,
                ]}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: `${theme.colors.primary}18` },
                  ]}
                >
                  <MessageSquare color={theme.colors.primary} size={22} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>
                    {t("supportDevelopment.feedbackTitle")}
                  </Text>
                  <Text style={styles.actionSubtitle}>
                    {t("supportDevelopment.feedbackSubtitle")}
                  </Text>
                </View>
              </Pressable>

              {/* 4. Upgrade to Pro (if available and not already Pro) */}
              {!isPro && onOpenPro && (
                <Pressable
                  accessibilityLabel={t("supportDevelopment.proTitle")}
                  accessibilityRole="button"
                  onPress={handlePro}
                  style={({ pressed }) => [
                    styles.actionCard,
                    styles.proActionCard,
                    pressed && styles.actionCardPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      { backgroundColor: "#EAB30825" },
                    ]}
                  >
                    <Crown color="#EAB308" size={22} />
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionTitle}>
                      {t("supportDevelopment.proTitle")}
                    </Text>
                    <Text style={styles.actionSubtitle}>
                      {t("supportDevelopment.proSubtitle")}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Bottom Close Button */}
            <View style={styles.footer}>
              <AppButton
                label={t("common.close")}
                onPress={onClose}
                variant="secondary"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.md,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    scrollView: {
      width: "100%",
    },
    scrollContent: {
      alignItems: "center",
      flexGrow: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 440,
      padding: theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      width: "100%",
    },
    cardDesktop: {
      maxWidth: 480,
    },
    header: {
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: 32,
      borderWidth: 1,
      height: 64,
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
      width: 64,
    },
    badge: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    heading: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: 4,
      textAlign: "center",
    },
    subheading: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.base,
      textAlign: "center",
    },
    actionsList: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    actionCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    proActionCard: {
      backgroundColor: "#EAB3080A",
      borderColor: "#EAB30830",
    },
    actionCardPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },
    actionIconContainer: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    actionCopy: {
      flex: 1,
    },
    actionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: 2,
    },
    actionSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 16,
    },
    footer: {
      width: "100%",
    },
  });
}
