import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Sparkles, Trophy } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface DashboardCongratulationsModalProps {
  visible: boolean;
  onClose: () => void;
  onExplore?: () => void;
  onSkip?: () => void;
}

export function DashboardCongratulationsModal({
  visible,
  onClose,
  onExplore,
  onSkip,
}: DashboardCongratulationsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const handleExplore = () => {
    if (onExplore) {
      onExplore();
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
            <Trophy color={theme.colors.primary} size={36} />
            <View style={styles.sparkleBadge}>
              <Sparkles color="#F59E0B" size={16} />
            </View>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.contentGroup}>
            <Text style={styles.title}>
              {t("dashboard.congratulationsTitle")}
            </Text>
            <Text style={styles.subtitle}>
              {t("dashboard.congratulationsSubtitle")}
            </Text>
            <Text style={styles.message}>
              {t("dashboard.congratulationsMessage")}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              accessibilityLabel={t("dashboard.congratulationsButton")}
              accessibilityRole="button"
              onPress={handleExplore}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {t("dashboard.congratulationsButton")}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={t("common.skipForNow")}
              accessibilityRole="button"
              onPress={handleSkip}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {t("common.skipForNow")}
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
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: theme.borderRadius.large * 1.3,
      borderWidth: 1.5,
      gap: theme.spacing.lg,
      maxWidth: 380,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xl * 1.2,
      width: "100%",
      ...theme.shadows.modal,
      elevation: 24,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: 44,
      borderWidth: 2,
      height: 80,
      justifyContent: "center",
      position: "relative",
      width: 80,
    },
    sparkleBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.border}`,
      borderRadius: 14,
      borderWidth: 1,
      bottom: -4,
      height: 28,
      justifyContent: "center",
      position: "absolute",
      right: -4,
      width: 28,
      ...theme.shadows.card,
    },
    contentGroup: {
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    subtitle: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    message: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm * 1.25,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    actions: {
      gap: theme.spacing.xs,
      width: "100%",
    },
    primaryBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: theme.spacing.xl,
      width: "100%",
    },
    primaryBtnPressed: {
      opacity: 0.88,
    },
    primaryBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    secondaryBtn: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: theme.spacing.lg,
      width: "100%",
    },
    secondaryBtnPressed: {
      backgroundColor: `${theme.colors.textSecondary}12`,
    },
    secondaryBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
