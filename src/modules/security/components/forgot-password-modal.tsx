import { useEffect, useState } from "react";
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
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  ShieldAlert,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { resetAppData } from "@/modules/settings";
import { appLockLifecycle } from "../services/app-lock-lifecycle.service";
import { authenticateWithBiometrics } from "../services/biometrics.service";
import {
  clearAllSecurityCredentials,
  setPassword,
} from "../services/security-state.service";

const CONFIRMATION_PHRASE = "KAIZEN";

type ModalStage = "options" | "new_password" | "confirm_reset";

export interface ForgotPasswordModalProps {
  visible: boolean;
  canUseBiometrics: boolean;
  biometricLabel: string;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export function ForgotPasswordModal({
  visible,
  canUseBiometrics,
  biometricLabel,
  onClose,
  onUnlockSuccess,
}: ForgotPasswordModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [stage, setStage] = useState<ModalStage>("options");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset confirmation state
  const [resetInput, setResetInput] = useState("");

  useEffect(() => {
    if (!visible) {
      setStage("options");
      setErrorMessage(null);
      setBusy(false);
      setNewPassword("");
      setConfirmPassword("");
      setResetInput("");
    }
  }, [visible]);

  if (!visible) return null;

  const handleBiometricResetPress = async () => {
    setErrorMessage(null);
    setBusy(true);

    try {
      const result = await authenticateWithBiometrics(
        t("security.verifyBiometricToReset", {
          biometric: biometricLabel || t("security.defaultBiometricLabel"),
        }),
      );

      if (result.success) {
        setStage("new_password");
      } else {
        setErrorMessage(
          result.error ?? t("security.biometricFailedFallback"),
        );
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Biometric error occurred.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveNewPassword = async () => {
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage(t("security.passwordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("security.passwordsDoNotMatch"));
      return;
    }

    setBusy(true);
    try {
      const result = await setPassword(newPassword, undefined, {
        skipCurrentPasswordVerification: true,
      });

      if (!result.success) {
        setErrorMessage(result.error ?? "Failed to save password.");
        return;
      }

      appLockLifecycle.unlock();
      onUnlockSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmEmergencyReset = async () => {
    if (resetInput.trim() !== CONFIRMATION_PHRASE) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);

    try {
      await resetAppData();
      await clearAllSecurityCredentials();
      appLockLifecycle.unlock();
      onUnlockSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Emergency reset failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
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
          onPress={onClose}
          style={styles.scrim}
        />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              {stage !== "options" ? (
                <Pressable
                  accessibilityLabel={t("common.goBack")}
                  accessibilityRole="button"
                  onPress={() => {
                    setStage("options");
                    setErrorMessage(null);
                  }}
                  style={styles.backButton}
                >
                  <ChevronLeft color={theme.colors.textPrimary} size={22} />
                </Pressable>
              ) : (
                <View style={styles.iconCircle}>
                  <ShieldAlert color={theme.colors.primary} size={20} />
                </View>
              )}
              <Text style={styles.headerTitle}>
                {stage === "options"
                  ? t("security.forgotPasswordTitle")
                  : stage === "new_password"
                    ? t("security.setNewPasswordTitle")
                    : t("security.emergencyResetConfirmTitle")}
              </Text>
            </View>

            <Pressable
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
              onPress={onClose}
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
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* STAGE: OPTIONS */}
            {stage === "options" ? (
              <View style={styles.optionsContainer}>
                <Text style={styles.subtitle}>
                  {t("security.forgotPasswordSubtitle")}
                </Text>

                {/* Option 1: Biometric Reset */}
                {canUseBiometrics ? (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIcon}>
                        <Fingerprint color={theme.colors.primary} size={22} />
                      </View>
                      <View style={styles.cardCopy}>
                        <Text style={styles.cardTitle}>
                          {t("security.biometricResetTitle", {
                            biometric:
                              biometricLabel ||
                              t("security.defaultBiometricLabel"),
                          })}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          {t("security.biometricResetDesc", {
                            biometric:
                              biometricLabel ||
                              t("security.defaultBiometricLabel"),
                          })}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityLabel={t("security.verifyBiometricToReset", {
                        biometric:
                          biometricLabel ||
                          t("security.defaultBiometricLabel"),
                      })}
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={handleBiometricResetPress}
                      style={({ pressed }) => [
                        styles.primaryActionBtn,
                        pressed && styles.primaryActionBtnPressed,
                        busy && styles.actionBtnDisabled,
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator
                          color={theme.colors.background}
                          size="small"
                        />
                      ) : (
                        <>
                          <Fingerprint
                            color={theme.colors.background}
                            size={18}
                          />
                          <Text style={styles.primaryActionBtnText}>
                            {t("security.verifyBiometricToReset", {
                              biometric:
                                biometricLabel ||
                                t("security.defaultBiometricLabel"),
                            })}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : null}

                {/* Option 3: Emergency Reset App Data */}
                <View style={[styles.card, styles.emergencyCard]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, styles.emergencyIcon]}>
                      <AlertTriangle color={theme.colors.danger} size={22} />
                    </View>
                    <View style={styles.cardCopy}>
                      <Text style={[styles.cardTitle, styles.emergencyTitle]}>
                        {t("security.emergencyResetTitle")}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {t("security.emergencyResetDesc")}
                      </Text>
                      <Text style={styles.emergencyWarning}>
                        {t("security.emergencyResetWarning")}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    accessibilityLabel={t("security.emergencyResetButton")}
                    accessibilityRole="button"
                    onPress={() => {
                      setErrorMessage(null);
                      setStage("confirm_reset");
                    }}
                    style={({ pressed }) => [
                      styles.emergencyActionBtn,
                      pressed && styles.emergencyActionBtnPressed,
                    ]}
                  >
                    <AlertTriangle color={theme.colors.danger} size={16} />
                    <Text style={styles.emergencyActionBtnText}>
                      {t("security.emergencyResetButton")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* STAGE: NEW PASSWORD (Option 1) */}
            {stage === "new_password" ? (
              <View style={styles.formContainer}>
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 color={theme.colors.success} size={18} />
                  <Text style={styles.verifiedBadgeText}>
                    {t("security.biometricVerifiedBadge", {
                      biometric:
                        biometricLabel || t("security.defaultBiometricLabel"),
                    })}
                  </Text>
                </View>

                <Text style={styles.subtitle}>
                  {t("security.setNewPasswordDesc")}
                </Text>

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
                        if (errorMessage) setErrorMessage(null);
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
                        if (errorMessage) setErrorMessage(null);
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
              </View>
            ) : null}

            {/* STAGE: CONFIRM RESET (Option 3) */}
            {stage === "confirm_reset" ? (
              <View style={styles.formContainer}>
                <View style={styles.emergencyWarningBox}>
                  <AlertTriangle color={theme.colors.danger} size={28} />
                  <Text style={styles.emergencyWarningBoxTitle}>
                    {t("security.emergencyResetConfirmTitle")}
                  </Text>
                  <Text style={styles.emergencyWarningBoxDesc}>
                    {t("security.emergencyResetConfirmDesc")}
                  </Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {t("security.emergencyResetInstruction")}
                  </Text>
                  <TextInput
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!busy}
                    onChangeText={(text) => {
                      setResetInput(text);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder={CONFIRMATION_PHRASE}
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.confirmationInput}
                    value={resetInput}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Sticky Actions Footer */}
          {stage !== "options" ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={t("common.cancel")}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  setStage("options");
                  setErrorMessage(null);
                }}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.cancelBtnPressed,
                ]}
              >
                <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
              </Pressable>

              {stage === "new_password" ? (
                <Pressable
                  accessibilityLabel={t("security.saveAndUnlockButton")}
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={handleSaveNewPassword}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && styles.submitBtnPressed,
                    busy && styles.actionBtnDisabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator
                      color={theme.colors.background}
                      size="small"
                    />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {t("security.saveAndUnlockButton")}
                    </Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  accessibilityLabel={t("security.emergencyResetAction")}
                  accessibilityRole="button"
                  disabled={busy || resetInput.trim() !== CONFIRMATION_PHRASE}
                  onPress={handleConfirmEmergencyReset}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    styles.dangerBtn,
                    pressed && styles.submitBtnPressed,
                    (busy || resetInput.trim() !== CONFIRMATION_PHRASE) &&
                      styles.actionBtnDisabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator
                      color={theme.colors.background}
                      size="small"
                    />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {t("security.emergencyResetAction")}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          ) : null}
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
      height: "85%",
      maxHeight: "85%",
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
      flex: 1,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    backButton: {
      padding: theme.spacing.xs,
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
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: theme.colors.danger,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorBannerText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
    },
    optionsContainer: {
      gap: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    emergencyCard: {
      backgroundColor: `${theme.colors.danger}06`,
      borderColor: `${theme.colors.danger}30`,
    },
    cardHeader: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    cardIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    emergencyIcon: {
      backgroundColor: `${theme.colors.danger}15`,
    },
    cardCopy: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    emergencyTitle: {
      color: theme.colors.danger,
    },
    cardSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    emergencyWarning: {
      color: theme.colors.danger,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 4,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    primaryActionBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      height: 44,
      justifyContent: "center",
      width: "100%",
    },
    primaryActionBtnPressed: {
      opacity: 0.85,
    },
    primaryActionBtnText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    emergencyActionBtn: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      height: 42,
      justifyContent: "center",
      width: "100%",
    },
    emergencyActionBtnPressed: {
      opacity: 0.8,
    },
    emergencyActionBtnText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    formContainer: {
      gap: theme.spacing.lg,
    },
    verifiedBadge: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: `${theme.colors.success}18`,
      borderColor: `${theme.colors.success}40`,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    verifiedBadgeText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
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
    confirmationInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      height: 48,
      letterSpacing: 1.5,
      paddingHorizontal: theme.spacing.md,
      textAlign: "center",
    },
    eyeButton: {
      padding: theme.spacing.xs,
    },
    emergencyWarningBox: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}10`,
      borderColor: `${theme.colors.danger}30`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
      textAlign: "center",
    },
    emergencyWarningBoxTitle: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
      marginTop: theme.spacing.xs,
    },
    emergencyWarningBoxDesc: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      textAlign: "center",
    },
    actions: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    cancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      height: 48,
      justifyContent: "center",
    },
    cancelBtnPressed: {
      opacity: 0.8,
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    submitBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flex: 2,
      height: 48,
      justifyContent: "center",
    },
    dangerBtn: {
      backgroundColor: theme.colors.danger,
    },
    submitBtnPressed: {
      opacity: 0.85,
    },
    actionBtnDisabled: {
      opacity: 0.5,
    },
    submitBtnText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
