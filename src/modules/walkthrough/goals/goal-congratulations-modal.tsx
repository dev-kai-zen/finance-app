import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Sparkles, Target } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface GoalCongratulationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function GoalCongratulationsModal({
  visible,
  onClose,
}: GoalCongratulationsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Celebratory Icon Badge */}
          <View style={styles.iconCircle}>
            <Target color={theme.colors.primary} size={36} />
            <View style={styles.sparkleBadge}>
              <Sparkles color="#F59E0B" size={16} />
            </View>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.contentGroup}>
            <Text style={styles.title}>
              {t("goalCongratulations.title")}
            </Text>
            <Text style={styles.subtitle}>
              {t("goalCongratulations.subtitle")}
            </Text>
            <Text style={styles.message}>
              {t("goalCongratulations.message")}
            </Text>
          </View>

          {/* Action Button */}
          <Pressable
            accessibilityLabel={t("goalCongratulations.button")}
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {t("goalCongratulations.button")}
            </Text>
          </Pressable>
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
      elevation: 2,
    },
    contentGroup: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: "center",
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      textAlign: "center",
      marginBottom: theme.spacing.md,
      letterSpacing: 0.5,
    },
    message: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    primaryBtn: {
      width: "100%",
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.medium,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtnPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    primaryBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
