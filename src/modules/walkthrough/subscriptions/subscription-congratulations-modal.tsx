import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Repeat, Sparkles } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface SubscriptionCongratulationsModalProps {
  visible: boolean;
  onClose: () => void;
  onStartTour?: () => void;
  onSkip?: () => void;
}

export function SubscriptionCongratulationsModal({
  visible,
  onClose,
  onStartTour,
  onSkip,
}: SubscriptionCongratulationsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const handleStart = () => {
    if (onStartTour) {
      onStartTour();
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleSkip}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Celebratory Icon Badge */}
          <View style={styles.iconCircle}>
            <Repeat color={theme.colors.primary} size={36} />
            <View style={styles.sparkleBadge}>
              <Sparkles color="#F59E0B" size={16} />
            </View>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.contentGroup}>
            <Text style={styles.title}>
              {t("subscriptionCongratulations.title", {
                defaultValue: "Subscription Added!",
              })}
            </Text>
            <Text style={styles.subtitle}>
              {t("subscriptionCongratulations.subtitle", {
                defaultValue: "Take control of your recurring bills",
              })}
            </Text>
            <Text style={styles.message}>
              {t("subscriptionCongratulations.message", {
                defaultValue:
                  "Congratulations on tracking your first subscription! Monitor renewal countdowns, monthly burn rate totals, and never miss an upcoming bill.",
              })}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              accessibilityLabel={t("subscriptionCongratulations.button", {
                defaultValue: "Explore Subscriptions Tour",
              })}
              accessibilityRole="button"
              onPress={handleStart}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {t("subscriptionCongratulations.button", {
                  defaultValue: "Explore Subscriptions Tour",
                })}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={t("common.skipForNow", {
                defaultValue: "Skip for now",
              })}
              accessibilityRole="button"
              onPress={handleSkip}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {t("common.skipForNow", { defaultValue: "Skip for now" })}
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
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    card: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large * 1.3,
      padding: theme.spacing.xl,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: `${theme.colors.primary}18`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: theme.spacing.lg,
      position: "relative",
    },
    sparkleBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    contentGroup: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center",
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
      textAlign: "center",
      marginBottom: 12,
    },
    message: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 8,
    },
    actions: {
      width: "100%",
      gap: theme.spacing.sm,
    },
    primaryBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.medium,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    primaryBtnPressed: {
      opacity: 0.85,
    },
    primaryBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },
    secondaryBtn: {
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    secondaryBtnPressed: {
      opacity: 0.6,
    },
    secondaryBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
  });
}
