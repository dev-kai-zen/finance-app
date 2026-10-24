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
  Compass,
  Crown,
  Heart,
  Mail,
  Sparkles,
  TrendingUp,
} from "lucide-react-native";

import { AppButton } from "@/components/app-button";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { sendFeedback } from "@/utils/send-feedback";

interface DeveloperMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenPro?: () => void;
  isPro?: boolean;
}

export function DeveloperMessageModal({
  visible,
  onClose,
  onOpenPro,
  isPro = false,
}: DeveloperMessageModalProps) {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const handleFeedback = () => {
    void sendFeedback({
      subject: "Kaizen Finance - Developer Feedback & Thoughts",
    });
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
            {/* Header Icon & Badge */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Heart color={theme.colors.primary} fill={`${theme.colors.primary}33`} size={28} />
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t("developerMessage.badge")}
                </Text>
              </View>
              <Text style={styles.heading}>
                {t("developerMessage.title")}
              </Text>
              <Text style={styles.subheading}>
                {t("developerMessage.subtitle")}
              </Text>
            </View>

            {/* Inspirational Body Sections */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Compass color={theme.colors.primary} size={18} />
                </View>
                <Text style={styles.sectionTitle}>
                  {t("developerMessage.missionTitle")}
                </Text>
              </View>
              <Text style={styles.sectionBody}>
                {t("developerMessage.missionBody")}
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: `${theme.colors.success}18` }]}>
                  <TrendingUp color={theme.colors.success} size={18} />
                </View>
                <Text style={styles.sectionTitle}>
                  {t("developerMessage.kaizenTitle")}
                </Text>
              </View>
              <Text style={styles.sectionBody}>
                {t("developerMessage.kaizenBody")}
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: "#D977061A" }]}>
                  <Crown color="#D97706" size={18} />
                </View>
                <Text style={styles.sectionTitle}>
                  {t("developerMessage.supportTitle")}
                </Text>
              </View>
              <Text style={styles.sectionBody}>
                {t("developerMessage.supportBody")}
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: `${theme.colors.info}18` }]}>
                  <Sparkles color={theme.colors.info} size={18} />
                </View>
                <Text style={styles.sectionTitle}>
                  {t("developerMessage.feedbackTitle")}
                </Text>
              </View>
              <Text style={styles.sectionBody}>
                {t("developerMessage.feedbackBody")}
              </Text>
            </View>

            {/* Signature Box */}
            <View style={styles.signatureBox}>
              <Text style={styles.signaturePre}>
                {t("developerMessage.signaturePre")}
              </Text>
              <Text style={styles.signatureName}>
                {t("developerMessage.signatureName")}
              </Text>
            </View>

            {/* Primary Action Button */}
            <AppButton
              label={t("developerMessage.actionBegin")}
              onPress={onClose}
              style={styles.primaryActionButton}
            />

            {/* Secondary Action Buttons */}
            <View style={styles.secondaryActionsRow}>
              <Pressable
                accessibilityLabel={t("developerMessage.actionFeedback")}
                accessibilityRole="button"
                onPress={handleFeedback}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Mail color={theme.colors.primary} size={16} />
                <Text style={styles.secondaryButtonText}>
                  {t("developerMessage.actionFeedback")}
                </Text>
              </Pressable>

              {!isPro && onOpenPro ? (
                <Pressable
                  accessibilityLabel={t("developerMessage.actionSupport")}
                  accessibilityRole="button"
                  onPress={() => {
                    onClose();
                    onOpenPro();
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.supportButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Crown color="#D97706" size={16} />
                  <Text style={[styles.secondaryButtonText, { color: "#D97706" }]}>
                    {t("developerMessage.actionSupport")}
                  </Text>
                </Pressable>
              ) : null}
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
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    scrollView: {
      width: "100%",
    },
    scrollContent: {
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xxl,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 560,
      padding: theme.spacing.xl,
      width: "100%",
    },
    cardDesktop: {
      maxWidth: 620,
    },
    header: {
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}14`,
      borderRadius: 30,
      height: 60,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 60,
    },
    badge: {
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.round,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 4,
    },
    badgeText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    heading: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    subheading: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: 4,
      textAlign: "center",
    },
    sectionCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: 6,
    },
    sectionIcon: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    sectionBody: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.base,
    },
    signatureBox: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}08`,
      borderColor: `${theme.colors.primary}20`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginVertical: theme.spacing.md,
      padding: theme.spacing.md,
    },
    signaturePre: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
    },
    signatureName: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: 2,
    },
    primaryActionButton: {
      marginTop: theme.spacing.sm,
      width: "100%",
    },
    secondaryActionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    supportButton: {
      borderColor: "#D9770644",
      backgroundColor: "#D9770610",
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    buttonPressed: {
      opacity: 0.75,
    },
  });
}
