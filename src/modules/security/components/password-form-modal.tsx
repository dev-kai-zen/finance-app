import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Eye, EyeOff, Lock, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export type PasswordModalMode = "set" | "change" | "remove";

export interface PasswordFormModalProps {
  visible: boolean;
  mode: PasswordModalMode;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<boolean>;
}

export function PasswordFormModal({
  visible,
  mode,
  busy,
  error: externalError,
  onClose,
  onSubmit,
}: PasswordFormModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!visible) return null;

  const resetFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLocalError(null);
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleSubmit = async () => {
    setLocalError(null);

    if (mode === "remove") {
      if (!currentPassword) {
        setLocalError(t("security.enterCurrentPassword"));
        return;
      }
      const success = await onSubmit({ currentPassword });
      if (success) handleClose();
      return;
    }

    if (mode === "change" && !currentPassword) {
      setLocalError(t("security.enterCurrentPassword"));
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setLocalError(t("security.passwordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError(t("security.passwordsDoNotMatch"));
      return;
    }

    const success = await onSubmit({
      currentPassword: mode === "change" ? currentPassword : undefined,
      newPassword,
    });

    if (success) {
      handleClose();
    }
  };

  const titles = {
    set: t("security.setPasswordTitle"),
    change: t("security.changePasswordTitle"),
    remove: t("security.removePasswordTitle"),
  };

  const buttonLabels = {
    set: t("security.savePasswordButton"),
    change: t("security.updatePasswordButton"),
    remove: t("security.removePasswordButton"),
  };

  const displayError = localError || externalError;

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={handleClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.modalCard,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Lock color={theme.colors.primary} size={20} />
              </View>
              <Text style={styles.headerTitle}>{titles[mode]}</Text>
            </View>
            <Pressable
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
              onPress={handleClose}
              style={styles.closeButton}
            >
              <X color={theme.colors.textMuted} size={20} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {mode === "remove" ? (
              <Text style={styles.description}>
                {t("security.removePasswordWarning")}
              </Text>
            ) : null}

            {mode === "change" || mode === "remove" ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {t("security.currentPasswordLabel")}
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(text) => {
                      setCurrentPassword(text);
                      setLocalError(null);
                    }}
                    placeholder={t("security.currentPasswordPlaceholder")}
                    placeholderTextColor={theme.colors.textMuted}
                    secureTextEntry={!showCurrent}
                    style={styles.input}
                    value={currentPassword}
                  />
                  <Pressable
                    onPress={() => setShowCurrent(!showCurrent)}
                    style={styles.eyeButton}
                  >
                    {showCurrent ? (
                      <EyeOff color={theme.colors.textMuted} size={18} />
                    ) : (
                      <Eye color={theme.colors.textMuted} size={18} />
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}

            {mode !== "remove" ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {t("security.newPasswordLabel")}
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setLocalError(null);
                      }}
                      placeholder={t("security.newPasswordPlaceholder")}
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry={!showNew}
                      style={styles.input}
                      value={newPassword}
                    />
                    <Pressable
                      onPress={() => setShowNew(!showNew)}
                      style={styles.eyeButton}
                    >
                      {showNew ? (
                        <EyeOff color={theme.colors.textMuted} size={18} />
                      ) : (
                        <Eye color={theme.colors.textMuted} size={18} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {t("security.confirmPasswordLabel")}
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setLocalError(null);
                      }}
                      placeholder={t("security.confirmPasswordPlaceholder")}
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry={!showConfirm}
                      style={styles.input}
                      value={confirmPassword}
                    />
                    <Pressable
                      onPress={() => setShowConfirm(!showConfirm)}
                      style={styles.eyeButton}
                    >
                      {showConfirm ? (
                        <EyeOff color={theme.colors.textMuted} size={18} />
                      ) : (
                        <Eye color={theme.colors.textMuted} size={18} />
                      )}
                    </Pressable>
                  </View>
                </View>
              </>
            ) : null}

            {displayError ? (
              <Text style={styles.errorText}>{displayError}</Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={t("common.cancel")}
                accessibilityRole="button"
                disabled={busy}
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
              >
                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
              </Pressable>

              <Pressable
                accessibilityLabel={buttonLabels[mode]}
                accessibilityRole="button"
                disabled={busy}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  mode === "remove" && styles.removeButton,
                  pressed && styles.submitButtonPressed,
                  busy && styles.submitButtonDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator
                    color={theme.colors.background}
                    size="small"
                  />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {buttonLabels[mode]}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "85%",
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    scrollContent: {
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    fieldGroup: {
      gap: theme.spacing.xs,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    inputContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      height: 48,
      paddingHorizontal: theme.spacing.md,
    },
    input: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      height: "100%",
    },
    eyeButton: {
      padding: theme.spacing.xs,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    cancelButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      height: 48,
      justifyContent: "center",
    },
    cancelButtonPressed: {
      opacity: 0.8,
    },
    cancelButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    submitButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flex: 2,
      height: 48,
      justifyContent: "center",
    },
    removeButton: {
      backgroundColor: theme.colors.danger,
    },
    submitButtonPressed: {
      opacity: 0.85,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
