import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyRound, X } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { validateBackupPassphrase } from "@/modules/backup/utils/backup-format";

interface BackupPassphraseModalProps {
  visible: boolean;
  mode: "create" | "restore";
  pending: boolean;
  onCancel: () => void;
  onSubmit: (passphrase: string) => Promise<boolean>;
}

export function BackupPassphraseModal({
  visible,
  mode,
  pending,
  onCancel,
  onSubmit,
}: BackupPassphraseModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPassphrase("");
      setConfirmation("");
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    const validationError = validateBackupPassphrase(passphrase);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (mode === "create" && passphrase !== confirmation) {
      setError("The passphrases do not match.");
      return;
    }

    setError(null);
    const succeeded = await onSubmit(passphrase);
    if (succeeded) onCancel();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!pending) onCancel();
      }}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Dismiss passphrase form"
          accessibilityRole="button"
          disabled={pending}
          onPress={onCancel}
          style={styles.backdrop}
        />

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <KeyRound color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.titleCopy}>
                <Text style={styles.title}>
                  {mode === "create" ? "Protect this backup" : "Unlock backup"}
                </Text>
                <Text style={styles.subtitle}>
                  {mode === "create"
                    ? "You will need this passphrase to restore on any device."
                    : "Enter the passphrase used when this backup was created."}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              disabled={pending}
              hitSlop={10}
              onPress={onCancel}
            >
              <X color={theme.colors.textMuted} size={20} />
            </Pressable>
          </View>

          <TextInput
            accessibilityLabel="Backup passphrase"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!pending}
            onChangeText={setPassphrase}
            onSubmitEditing={mode === "restore" ? handleSubmit : undefined}
            placeholder="At least 12 characters"
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType={mode === "restore" ? "done" : "next"}
            secureTextEntry
            style={styles.input}
            value={passphrase}
          />

          {mode === "create" ? (
            <TextInput
              accessibilityLabel="Confirm backup passphrase"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!pending}
              onChangeText={setConfirmation}
              onSubmitEditing={handleSubmit}
              placeholder="Confirm passphrase"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              value={confirmation}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.warning}>
            Kaizen Finance cannot recover a forgotten passphrase.
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={onCancel}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={handleSubmit}
              style={[styles.button, styles.submitButton, pending && styles.disabled]}
            >
              {pending ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "create" ? "Create backup" : "Restore"}
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
    overlay: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.72)",
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
      gap: theme.spacing.md,
      maxWidth: 440,
      padding: theme.spacing.xl,
      width: "100%",
      ...theme.shadows.modal,
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    titleRow: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: 999,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    titleCopy: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    input: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    error: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
    },
    warning: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    button: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: theme.spacing.md,
    },
    cancelButton: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
    },
    cancelText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    submitText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    disabled: {
      opacity: 0.6,
    },
  });
}
