import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react-native";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export type ConfirmModalVariant = "destructive" | "restore";

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "destructive",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const iconColor =
    variant === "restore" ? theme.colors.success : theme.colors.danger;
  const iconBg =
    variant === "restore"
      ? `${theme.colors.success}18`
      : `${theme.colors.danger}18`;
  const iconBorder =
    variant === "restore"
      ? `${theme.colors.success}40`
      : `${theme.colors.danger}40`;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!pending) onCancel();
      }}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Dismiss confirmation"
          accessibilityRole="button"
          disabled={pending}
          onPress={onCancel}
          style={styles.backdrop}
        />

        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: iconBg, borderColor: iconBorder },
            ]}
          >
            {variant === "restore" ? (
              <RotateCcw color={iconColor} size={24} />
            ) : (
              <Trash2 color={iconColor} size={24} />
            )}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel={cancelLabel}
              accessibilityRole="button"
              disabled={pending}
              onPress={onCancel}
              style={[styles.cancelBtn, pending && styles.btnDisabled]}
            >
              <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={confirmLabel}
              accessibilityRole="button"
              disabled={pending}
              onPress={onConfirm}
              style={[
                styles.confirmBtn,
                variant === "restore"
                  ? styles.confirmBtnRestore
                  : styles.confirmBtnDestructive,
                pending && styles.btnDisabled,
              ]}
            >
              {pending ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <>
                  {variant === "destructive" ? (
                    <AlertTriangle color={theme.colors.onPrimary} size={16} />
                  ) : null}
                  <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
                </>
              )}
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
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    cancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: theme.spacing.md,
    },
    cancelBtnText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    confirmBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: theme.spacing.md,
    },
    confirmBtnDestructive: {
      backgroundColor: theme.colors.danger,
    },
    confirmBtnRestore: {
      backgroundColor: theme.colors.success,
    },
    confirmBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
}
