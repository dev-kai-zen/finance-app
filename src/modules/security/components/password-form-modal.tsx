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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { CheckCircle2, Eye, EyeOff, Fingerprint, Lock, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { authenticateWithBiometrics } from "../services/biometrics.service";

export type PasswordModalMode = "set" | "change" | "remove";

export interface PasswordFormModalProps {
  visible: boolean;
  mode: PasswordModalMode;
  busy: boolean;
  error?: string | null;
  biometricsAvailable?: boolean;
  biometricLabel?: string;
  onClose: () => void;
  onSubmit: (data: {
    currentPassword?: string;
    newPassword?: string;
    biometricsVerified?: boolean;
  }) => Promise<boolean>;
}

export function PasswordFormModal({
  visible,
  mode,
  busy,
  error: externalError,
  biometricsAvailable = false,
  biometricLabel,
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
  const [biometricsVerified, setBiometricsVerified] = useState(false);
  const [verifyingBiometrics, setVerifyingBiometrics] = useState(false);

  if (!visible) return null;

  const resetFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLocalError(null);
    setBiometricsVerified(false);
    setVerifyingBiometrics(false);
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleVerifyBiometrics = async () => {
    setLocalError(null);
    setVerifyingBiometrics(true);
    try {
      const label = biometricLabel || t("security.defaultBiometricLabel");
      const result = await authenticateWithBiometrics(
        t("security.verifyBiometricToReset", { biometric: label }),
      );
      if (result.success) {
        setBiometricsVerified(true);
        setCurrentPassword("");
      } else {
        setLocalError(
          result.error ?? t("security.biometricFailedFallback"),
        );
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Biometric error");
    } finally {
      setVerifyingBiometrics(false);
    }
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

    if (mode === "change" && !currentPassword && !biometricsVerified) {
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
      currentPassword:
        mode === "change" && !biometricsVerified ? currentPassword : undefined,
      newPassword,
      biometricsVerified: mode === "change" ? biometricsVerified : undefined,
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
      <KeyboardAvoidingView
        automaticOffset
        behavior="height"
        style={styles.keyboardAvoid}
      >
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={handleClose}
          style={styles.scrim}
        />
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.md) },
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
            showsVerticalScrollIndicator={false}
            style={styles.scrollList}
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

                {mode === "change" && biometricsVerified ? (
                  <View style={styles.biometricVerifiedChip}>
                    <CheckCircle2 color={theme.colors.success} size={16} />
                    <Text style={styles.biometricVerifiedChipText}>
                      {t("security.biometricVerifiedBadge", {
                        biometric:
                          biometricLabel || t("security.defaultBiometricLabel"),
                      })}
                    </Text>
                  </View>
                ) : (
                  <>
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

                    {biometricsAvailable && mode === "change" ? (
                      <Pressable
                        accessibilityLabel={t(
                          "security.verifyWithBiometricToChange",
                          {
                            biometric:
                              biometricLabel ||
                              t("security.defaultBiometricLabel"),
                          },
                        )}
                        accessibilityRole="button"
                        disabled={busy || verifyingBiometrics}
                        onPress={handleVerifyBiometrics}
                        style={({ pressed }) => [
                          styles.biometricVerifyButton,
                          pressed && styles.biometricVerifyButtonPressed,
                        ]}
                      >
                        {verifyingBiometrics ? (
                          <ActivityIndicator
                            color={theme.colors.primary}
                            size="small"
                          />
                        ) : (
                          <Fingerprint
                            color={theme.colors.primary}
                            size={16}
                          />
                        )}
                        <Text style={styles.biometricVerifyButtonText}>
                          {t("security.verifyWithBiometricToChange", {
                            biometric:
                              biometricLabel ||
                              t("security.defaultBiometricLabel"),
                          })}
                        </Text>
                      </Pressable>
                    ) : null}

                    {biometricsAvailable && mode === "remove" ? (
                      <Pressable
                        accessibilityLabel={t(
                          "security.verifyWithBiometricToRemove",
                          {
                            biometric:
                              biometricLabel ||
                              t("security.defaultBiometricLabel"),
                          },
                        )}
                        accessibilityRole="button"
                        disabled={busy || verifyingBiometrics}
                        onPress={async () => {
                          setLocalError(null);
                          setVerifyingBiometrics(true);
                          try {
                            const label =
                              biometricLabel ||
                              t("security.defaultBiometricLabel");
                            const result = await authenticateWithBiometrics(
                              t("security.verifyBiometricToReset", {
                                biometric: label,
                              }),
                            );
                            if (result.success) {
                              const success = await onSubmit({
                                biometricsVerified: true,
                              });
                              if (success) handleClose();
                            } else {
                              setLocalError(
                                result.error ??
                                  t("security.biometricFailedFallback"),
                              );
                            }
                          } finally {
                            setVerifyingBiometrics(false);
                          }
                        }}
                        style={({ pressed }) => [
                          styles.biometricVerifyButton,
                          pressed && styles.biometricVerifyButtonPressed,
                        ]}
                      >
                        {verifyingBiometrics ? (
                          <ActivityIndicator
                            color={theme.colors.danger}
                            size="small"
                          />
                        ) : (
                          <Fingerprint
                            color={theme.colors.danger}
                            size={16}
                          />
                        )}
                        <Text
                          style={[
                            styles.biometricVerifyButtonText,
                            { color: theme.colors.danger },
                          ]}
                        >
                          {t("security.verifyWithBiometricToRemove", {
                            biometric:
                              biometricLabel ||
                              t("security.defaultBiometricLabel"),
                          })}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
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
          </ScrollView>

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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    keyboardAvoid: {
      flex: 1,
      justifyContent: "flex-end",
    },
    scrim: {
      backgroundColor: theme.colors.overlay,
      ...StyleSheet.absoluteFill,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      flexDirection: "column",
      height: "75%",
      maxHeight: "75%",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      width: "100%",
      ...theme.shadows.modal,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.md,
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
    scrollList: {
      flex: 1,
    },
    scrollContent: {
      gap: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
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
      letterSpacing: 0.5,
      textTransform: "uppercase",
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
    biometricVerifyButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      marginTop: 2,
    },
    biometricVerifyButtonPressed: {
      opacity: 0.7,
    },
    biometricVerifyButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    biometricVerifiedChip: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: `${theme.colors.success}18`,
      borderColor: `${theme.colors.success}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      marginTop: 2,
    },
    biometricVerifiedChipText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
    },
    actions: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingTop: theme.spacing.md,
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
