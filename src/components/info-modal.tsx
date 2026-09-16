import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react-native";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export type InfoModalVariant = "info" | "success" | "error";

export interface InfoModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel?: string;
  variant?: InfoModalVariant;
  onClose: () => void;
}

export function InfoModal({
  visible,
  title,
  message,
  buttonLabel = "OK",
  variant = "info",
  onClose,
}: InfoModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const accentColor =
    variant === "success"
      ? theme.colors.success
      : variant === "error"
        ? theme.colors.danger
        : theme.colors.primary;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Dismiss message"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: `${accentColor}18`,
                borderColor: `${accentColor}40`,
              },
            ]}
          >
            {variant === "success" ? (
              <CheckCircle2 color={accentColor} size={24} />
            ) : variant === "error" ? (
              <AlertTriangle color={accentColor} size={24} />
            ) : (
              <Info color={accentColor} size={24} />
            )}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            accessibilityLabel={buttonLabel}
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.confirmBtn, { backgroundColor: accentColor }]}
          >
            <Text style={styles.confirmBtnText}>{buttonLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 420,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      width: "100%",
      ...theme.shadows.modal,
    },
    cardDesktop: {
      maxWidth: 440,
    },
    iconCircle: {
      alignItems: "center",
      alignSelf: "center",
      borderRadius: 999,
      borderWidth: 1,
      height: 56,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 56,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
    },
    message: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      marginBottom: theme.spacing.xl,
      textAlign: "center",
    },
    confirmBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: theme.spacing.md,
    },
    confirmBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
