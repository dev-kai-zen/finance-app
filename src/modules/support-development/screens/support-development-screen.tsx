import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Check,
  ChevronRight,
  Crown,
  Heart,
  MessageSquare,
  Share2,
  Star,
} from "lucide-react-native";

import { ModalScreenHeader, PageContainer } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ProPaywallModal, useProStatus } from "@/modules/pro";
import { sendFeedback } from "@/utils/send-feedback";

import { openStoreReviewPage } from "../services/open-store-review.service";
import { shareApp } from "../services/share-app.service";

export function SupportDevelopmentScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPro } = useProStatus();
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

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

  return (
    <View style={styles.screen}>
      <ModalScreenHeader title={t("navigation.supportDevelopment")} />

      <PageContainer contentContainerStyle={styles.container} maxWidth={680}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Heart
              color={theme.colors.primary}
              fill={`${theme.colors.primary}33`}
              size={32}
            />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {t("supportDevelopment.badge")}
            </Text>
          </View>
          <Text style={styles.heroTitle}>
            {t("supportDevelopment.title")}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t("supportDevelopment.heroDescription")}
          </Text>
        </View>

        {/* Section 1: Spread the Word */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            {t("supportDevelopment.spreadSectionTitle")}
          </Text>
          <View style={styles.cardGroup}>
            {/* Rate on Google Play */}
            <Pressable
              accessibilityLabel={t("supportDevelopment.rateTitle")}
              accessibilityRole="button"
              onPress={handleRate}
              style={({ pressed }) => [
                styles.itemRow,
                pressed && styles.itemRowPressed,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: "#F59E0B18" },
                ]}
              >
                <Star color="#F59E0B" fill="#F59E0B" size={20} />
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>
                  {t("supportDevelopment.rateTitle")}
                </Text>
                <Text style={styles.itemSubtitle}>
                  {t("supportDevelopment.rateSubtitle")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>

            <View style={styles.divider} />

            {/* Share with Friends */}
            <Pressable
              accessibilityLabel={t("supportDevelopment.shareTitle")}
              accessibilityRole="button"
              onPress={handleShare}
              style={({ pressed }) => [
                styles.itemRow,
                pressed && styles.itemRowPressed,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${theme.colors.accent}18` },
                ]}
              >
                <Share2 color={theme.colors.accent} size={20} />
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>
                  {t("supportDevelopment.shareTitle")}
                </Text>
                <Text style={styles.itemSubtitle}>
                  {t("supportDevelopment.shareSubtitle")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>

        {/* Section 2: Direct Support */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            {t("supportDevelopment.directSectionTitle")}
          </Text>
          <View style={styles.cardGroup}>
            {isPro ? (
              <View style={[styles.itemRow, styles.proActiveRow]}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: "#EAB30825" },
                  ]}
                >
                  <Crown color="#EAB308" size={20} />
                </View>
                <View style={styles.itemCopy}>
                  <View style={styles.proActiveHeader}>
                    <Text style={styles.itemTitle}>
                      {t("supportDevelopment.proActiveBadge")}
                    </Text>
                    <View style={styles.proCheckBadge}>
                      <Check color="#FFFFFF" size={12} strokeWidth={3} />
                    </View>
                  </View>
                  <Text style={styles.itemSubtitle}>
                    {t("supportDevelopment.proActiveSubtitle")}
                  </Text>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityLabel={t("supportDevelopment.proTitle")}
                accessibilityRole="button"
                onPress={() => setIsPaywallOpen(true)}
                style={({ pressed }) => [
                  styles.itemRow,
                  styles.proRow,
                  pressed && styles.itemRowPressed,
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: "#EAB30825" },
                  ]}
                >
                  <Crown color="#EAB308" size={20} />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle}>
                    {t("supportDevelopment.proTitle")}
                  </Text>
                  <Text style={styles.itemSubtitle}>
                    {t("supportDevelopment.proSubtitle")}
                  </Text>
                </View>
                <ChevronRight color="#EAB308" size={18} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Section 3: Get in Touch */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            {t("supportDevelopment.feedbackSectionTitle")}
          </Text>
          <View style={styles.cardGroup}>
            <Pressable
              accessibilityLabel={t("supportDevelopment.feedbackTitle")}
              accessibilityRole="button"
              onPress={handleFeedback}
              style={({ pressed }) => [
                styles.itemRow,
                pressed && styles.itemRowPressed,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${theme.colors.primary}18` },
                ]}
              >
                <MessageSquare color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>
                  {t("supportDevelopment.feedbackTitle")}
                </Text>
                <Text style={styles.itemSubtitle}>
                  {t("supportDevelopment.feedbackSubtitle")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>
      </PageContainer>

      <ProPaywallModal
        onClose={() => setIsPaywallOpen(false)}
        visible={isPaywallOpen}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    container: {
      gap: theme.spacing.lg,
      paddingBottom: 60,
      paddingTop: theme.spacing.md,
    },
    heroCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.xl,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
    },
    heroIconCircle: {
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
    heroTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    heroSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.base,
      textAlign: "center",
    },
    section: {
      gap: theme.spacing.xs,
    },
    sectionHeader: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 1.2,
      paddingHorizontal: theme.spacing.sm,
      textTransform: "uppercase",
    },
    cardGroup: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      overflow: "hidden",
    },
    itemRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 64,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    itemRowPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.8,
    },
    proRow: {
      backgroundColor: "#EAB3080A",
    },
    proActiveRow: {
      backgroundColor: "#22C55E0A",
    },
    proActiveHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    proCheckBadge: {
      alignItems: "center",
      backgroundColor: "#22C55E",
      borderRadius: 8,
      height: 16,
      justifyContent: "center",
      width: 16,
    },
    iconContainer: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    itemCopy: {
      flex: 1,
    },
    itemTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: 2,
    },
    itemSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 16,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginLeft: 68,
    },
  });
}

