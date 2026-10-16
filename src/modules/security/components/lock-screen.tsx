import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Eye, EyeOff, Fingerprint, Lock, ShieldCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useAppLock } from "../hooks/use-app-lock";
import { ForgotPasswordModal } from "./forgot-password-modal";

export function LockScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const {
    config,
    biometrics,
    unlockWithPassword,
    unlockWithBiometrics,
  } = useAppLock();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);

  const resolveBiometricErrorMessage = (
    errorCode?: string,
    rawError?: string,
  ): string => {
    const code = (errorCode || rawError || "").toLowerCase();
    if (
      code === "user_cancel" ||
      code === "user_fallback" ||
      code === "system_cancel" ||
      code === "app_cancel" ||
      code === "cancel" ||
      code.includes("cancel") ||
      code.includes("fallback")
    ) {
      return t("security.biometricCancelledFallback");
    }
    if (code === "lockout" || code.includes("lockout")) {
      return t("security.biometricLockoutFallback");
    }
    return t("security.biometricFailedFallback");
  };

  // Automatically trigger biometric unlock when lock screen appears
  useEffect(() => {
    let active = true;

    async function promptBiometrics() {
      if (
        config.isBiometricsEnabled &&
        biometrics.hasHardware &&
        biometrics.isEnrolled
      ) {
        const result = await unlockWithBiometrics();
        if (!active) return;
        if (!result.success) {
          setErrorMessage(
            resolveBiometricErrorMessage(result.errorCode, result.error),
          );
        }
      }
    }

    // Small delay to allow layout to settle
    const timer = setTimeout(() => {
      void promptBiometrics();
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    config.isBiometricsEnabled,
    biometrics.hasHardware,
    biometrics.isEnrolled,
    unlockWithBiometrics,
  ]);

  const handlePasswordSubmit = async () => {
    if (!password) {
      setErrorMessage(t("security.enterPassword"));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await unlockWithPassword(password);
      if (!result.success) {
        setErrorMessage(result.error ?? t("security.incorrectPassword"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricPress = async () => {
    setErrorMessage(null);
    const result = await unlockWithBiometrics();
    if (!result.success) {
      setErrorMessage(
        resolveBiometricErrorMessage(result.errorCode, result.error),
      );
    }
  };

  const canUseBiometrics =
    config.isBiometricsEnabled &&
    biometrics.hasHardware &&
    biometrics.isEnrolled;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xl,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <ShieldCheck color={theme.colors.primary} size={40} />
            </View>
            <Text style={styles.title}>{t("security.appLockedTitle")}</Text>
            <Text style={styles.subtitle}>
              {canUseBiometrics
                ? t("security.enterPasswordOrBiometrics", {
                    biometric: biometrics.biometricLabel,
                  })
                : t("security.enterPasswordToUnlock")}
            </Text>
          </View>

          {canUseBiometrics ? (
            <View style={styles.biometricSection}>
              <Pressable
                accessibilityLabel={t("security.unlockWithBiometric", {
                  biometric: biometrics.biometricLabel,
                })}
                accessibilityRole="button"
                onPress={handleBiometricPress}
                style={({ pressed }) => [
                  styles.biometricButton,
                  pressed && styles.biometricButtonPressed,
                ]}
              >
                <Fingerprint color={theme.colors.primary} size={36} />
                <Text style={styles.biometricButtonText}>
                  {t("security.tapToScan", {
                    biometric: biometrics.biometricLabel,
                  })}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Lock
                color={theme.colors.textMuted}
                size={20}
                style={styles.inputLeftIcon}
              />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                onSubmitEditing={handlePasswordSubmit}
                placeholder={t("security.passwordPlaceholder")}
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="done"
                secureTextEntry={!showPassword}
                style={styles.input}
                value={password}
              />
              <Pressable
                accessibilityLabel={
                  showPassword
                    ? t("security.hidePassword")
                    : t("security.showPassword")
                }
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff color={theme.colors.textMuted} size={20} />
                ) : (
                  <Eye color={theme.colors.textMuted} size={20} />
                )}
              </Pressable>
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Pressable
              accessibilityLabel={t("security.unlockButton")}
              accessibilityRole="button"
              disabled={submitting}
              onPress={handlePasswordSubmit}
              style={({ pressed }) => [
                styles.unlockButton,
                pressed && styles.unlockButtonPressed,
                submitting && styles.unlockButtonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.background} size="small" />
              ) : (
                <Text style={styles.unlockButtonText}>
                  {t("security.unlockButton")}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityLabel={t("security.forgotPassword")}
              accessibilityRole="button"
              onPress={() => {
                setErrorMessage(null);
                setForgotPasswordVisible(true);
              }}
              style={({ pressed }) => [
                styles.forgotPasswordButton,
                pressed && styles.forgotPasswordButtonPressed,
              ]}
            >
              <Text style={styles.forgotPasswordText}>
                {t("security.forgotPassword")}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        biometricLabel={biometrics.biometricLabel}
        canUseBiometrics={canUseBiometrics}
        onClose={() => setForgotPasswordVisible(false)}
        onUnlockSuccess={() => {
          setPassword("");
          setErrorMessage(null);
        }}
        visible={forgotPasswordVisible}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
    },
    keyboardAvoid: {
      flex: 1,
      justifyContent: "center",
    },
    content: {
      gap: theme.spacing.xxl,
      maxWidth: 400,
      width: "100%",
      alignSelf: "center",
    },
    header: {
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 80,
      justifyContent: "center",
      width: 80,
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      textAlign: "center",
      paddingHorizontal: theme.spacing.md,
      lineHeight: theme.typography.lineHeight.sm,
    },
    biometricSection: {
      alignItems: "center",
    },
    biometricButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.xs,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      width: "100%",
      ...theme.shadows.card,
    },
    biometricButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    biometricButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    form: {
      gap: theme.spacing.md,
    },
    inputContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      height: 52,
      paddingHorizontal: theme.spacing.md,
    },
    inputLeftIcon: {
      marginRight: theme.spacing.sm,
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
      textAlign: "center",
    },
    unlockButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.large,
      height: 50,
      justifyContent: "center",
    },
    unlockButtonPressed: {
      opacity: 0.85,
    },
    unlockButtonDisabled: {
      opacity: 0.6,
    },
    unlockButtonText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    forgotPasswordButton: {
      alignItems: "center",
      alignSelf: "center",
      marginTop: theme.spacing.xs,
      padding: theme.spacing.xs,
    },
    forgotPasswordButtonPressed: {
      opacity: 0.7,
    },
    forgotPasswordText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
