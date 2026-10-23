import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CalendarClock, Sparkles } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface FirstScheduleCongratulationsModalProps {
  visible: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

export function FirstScheduleCongratulationsModal({
  visible,
  onClose,
  onStartTour,
}: FirstScheduleCongratulationsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const handleAction = () => {
    onClose();
    onStartTour?.();
  };

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
            <CalendarClock color={theme.colors.primary} size={36} />
            <View style={styles.sparkleBadge}>
              <Sparkles color="#F59E0B" size={16} />
            </View>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.contentGroup}>
            <Text style={styles.title}>
              {t("scheduleCongratulations.title")}
            </Text>
            <Text style={styles.subtitle}>
              {t("scheduleCongratulations.subtitle")}
            </Text>
            <Text style={styles.message}>
              {t("scheduleCongratulations.message")}
            </Text>
          </View>

          {/* Action Button */}
          <Pressable
            accessibilityLabel={t("scheduleCongratulations.button")}
            accessibilityRole="button"
            onPress={handleAction}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Sparkles color="#FFFFFF" size={16} />
            <Text style={styles.primaryBtnText}>
              {t("scheduleCongratulations.button")}
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
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 24,
      borderWidth: 1,
      maxWidth: 360,
      padding: theme.spacing.xl,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      width: "100%",
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: 36,
      height: 72,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      position: "relative",
      width: 72,
    },
    sparkleBadge: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      bottom: -2,
      padding: 3,
      position: "absolute",
      right: -2,
    },
    contentGroup: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    subtitle: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: theme.spacing.sm,
      textAlign: "center",
    },
    message: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
    },
    primaryBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      width: "100%",
    },
    primaryBtnPressed: {
      opacity: 0.85,
    },
    primaryBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
