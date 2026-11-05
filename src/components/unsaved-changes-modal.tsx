import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AlertTriangle, Check, Trash2 } from "lucide-react-native";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface UnsavedChangesModalProps {
  visible: boolean;
  onSave?: () => void | Promise<unknown>;
  onDiscard: () => void;
  onKeepEditing: () => void;
  saveDisabled?: boolean;
  pending?: boolean;
  title?: string;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
  keepEditingLabel?: string;
}

export function UnsavedChangesModal({
  visible,
  onSave,
  onDiscard,
  onKeepEditing,
  saveDisabled = false,
  pending = false,
  title,
  message,
  saveLabel,
  discardLabel,
  keepEditingLabel,
}: UnsavedChangesModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const resolvedTitle = title ?? t("common.unsavedChangesTitle");
  const resolvedMessage = message ?? t("common.unsavedChangesMessage");
  const resolvedSaveLabel = saveLabel ?? t("common.saveChanges");
  const resolvedDiscardLabel = discardLabel ?? t("common.dontSave");
  const resolvedKeepEditingLabel = keepEditingLabel ?? t("common.keepEditing");

  const warningColor = theme.colors.warning ?? "#F59E0B";
  const iconBg = `${warningColor}18`;
  const iconBorder = `${warningColor}40`;

  const canSave = Boolean(onSave) && !saveDisabled;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!pending) onKeepEditing();
      }}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Dismiss unsaved changes prompt"
          accessibilityRole="button"
          disabled={pending}
          onPress={onKeepEditing}
          style={styles.backdrop}
        />

        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: iconBg, borderColor: iconBorder },
            ]}
          >
            <AlertTriangle color={warningColor} size={24} />
          </View>

          <Text style={styles.title}>{resolvedTitle}</Text>
          <Text style={styles.message}>{resolvedMessage}</Text>

          <View style={styles.actions}>
            {/* Primary Action: Save Changes (if save action exists and is not disabled) */}
            {canSave ? (
              <Pressable
                accessibilityLabel={resolvedSaveLabel}
                accessibilityRole="button"
                disabled={pending}
                onPress={onSave}
                style={[styles.btn, styles.saveBtn, pending && styles.btnDisabled]}
              >
                {pending ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  <>
                    <Check color={theme.colors.onPrimary} size={16} />
                    <Text style={styles.saveBtnText}>{resolvedSaveLabel}</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Destructive Action: Don't Save */}
            <Pressable
              accessibilityLabel={resolvedDiscardLabel}
              accessibilityRole="button"
              disabled={pending}
              onPress={onDiscard}
              style={[
                styles.btn,
                styles.discardBtn,
                pending && styles.btnDisabled,
              ]}
            >
              <Trash2 color={theme.colors.danger} size={16} />
              <Text style={styles.discardBtnText}>{resolvedDiscardLabel}</Text>
            </Pressable>

            {/* Cancel Action: Keep Editing */}
            <Pressable
              accessibilityLabel={resolvedKeepEditingLabel}
              accessibilityRole="button"
              disabled={pending}
              onPress={onKeepEditing}
              style={[
                styles.btn,
                styles.keepEditingBtn,
                pending && styles.btnDisabled,
              ]}
            >
              <Text style={styles.keepEditingBtnText}>
                {resolvedKeepEditingLabel}
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
      backgroundColor: theme.colors.overlay,
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
      maxWidth: 400,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      width: "100%",
      ...theme.shadows.modal,
    },
    cardDesktop: {
      maxWidth: 420,
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
      marginBottom: theme.spacing.lg,
      textAlign: "center",
    },
    actions: {
      flexDirection: "column",
      gap: theme.spacing.sm,
    },
    btn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: theme.spacing.md,
      width: "100%",
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
    },
    saveBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    discardBtn: {
      backgroundColor: `${theme.colors.danger}14`,
      borderColor: `${theme.colors.danger}38`,
      borderWidth: 1,
    },
    discardBtnText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    keepEditingBtn: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    keepEditingBtnText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
}

