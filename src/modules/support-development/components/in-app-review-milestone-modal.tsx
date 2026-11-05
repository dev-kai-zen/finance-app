import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Sparkles, Star } from "lucide-react-native";

import { AppButton } from "@/components/app-button";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

interface InAppReviewMilestoneModalProps {
  visible: boolean;
  onRateNow: () => void;
  onMaybeLater: () => void;
  onNeverAskAgain: () => void;
}

export function InAppReviewMilestoneModal({
  visible,
  onRateNow,
  onMaybeLater,
  onNeverAskAgain,
}: InAppReviewMilestoneModalProps) {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onMaybeLater}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onMaybeLater}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.card,
            isTabletOrDesktop(width) && styles.cardDesktop,
          ]}
        >
          {/* Header Icon & Badge */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Star color="#F59E0B" fill="#F59E0B" size={32} />
              <View style={styles.sparkleBadge}>
                <Sparkles color="#FFFFFF" size={14} />
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {t("inAppReview.badge")}
              </Text>
            </View>
            <Text style={styles.heading}>
              {t("inAppReview.title")}
            </Text>
            <Text style={styles.subheading}>
              {t("inAppReview.description")}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <AppButton
              label={t("inAppReview.rateAction")}
              onPress={onRateNow}
              variant="primary"
            />
            <AppButton
              label={t("inAppReview.maybeLaterAction")}
              onPress={onMaybeLater}
              variant="secondary"
            />
            <Pressable
              accessibilityLabel={t("inAppReview.dontAskAgain")}
              accessibilityRole="button"
              onPress={onNeverAskAgain}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && styles.dismissButtonPressed,
              ]}
            >
              <Text style={styles.dismissButtonText}>
                {t("inAppReview.dontAskAgain")}
              </Text>
            </Pressable>
          </View>
        </View>
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
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 420,
      padding: theme.spacing.xl,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      width: "100%",
    },
    cardDesktop: {
      maxWidth: 460,
    },
    header: {
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: "#F59E0B18",
      borderColor: "#F59E0B40",
      borderRadius: 36,
      borderWidth: 1.5,
      height: 72,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      position: "relative",
      width: 72,
    },
    sparkleBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      bottom: -2,
      height: 20,
      justifyContent: "center",
      position: "absolute",
      right: -2,
      width: 20,
    },
    badge: {
      backgroundColor: "#F59E0B15",
      borderColor: "#F59E0B40",
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeText: {
      color: "#D97706",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    heading: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    subheading: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.base,
      textAlign: "center",
    },
    actionContainer: {
      gap: theme.spacing.sm,
    },
    dismissButton: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      paddingVertical: theme.spacing.xs,
    },
    dismissButtonPressed: {
      opacity: 0.7,
    },
    dismissButtonText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
  });
}
